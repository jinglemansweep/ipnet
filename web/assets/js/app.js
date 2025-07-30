// Main application JavaScript
let config = {};
let nodes = [];
let members = [];

// Get path prefix from meta tag or default
function getPathPrefix() {
    const metaTag = document.querySelector('meta[name="path-prefix"]');
    return metaTag ? metaTag.getAttribute('content') : '';
}

// Load configuration and data
async function loadData() {
    const pathPrefix = getPathPrefix();
    try {
        const [configResponse, nodesResponse, membersResponse] = await Promise.all([
            fetch(`${pathPrefix}/assets/data/config.json`),
            fetch(`${pathPrefix}/assets/data/nodes.json`),
            fetch(`${pathPrefix}/assets/data/members.json`)
        ]);

        config = await configResponse.json();
        const nodesData = await nodesResponse.json();
        const membersData = await membersResponse.json();
        
        nodes = nodesData.nodes.filter(node => node.isPublic);
        members = membersData.members.filter(member => member.isPublic);
        
        return { config, nodes, members };
    } catch (error) {
        console.error('Error loading data:', error);
        return { config: {}, nodes: [], members: [] };
    }
}

// Home page data
function homeData() {
    return {
        stats: {
            totalNodes: 0,
            totalMembers: 0,
            coverageArea: 0
        },
        
        async init() {
            const data = await loadData();
            this.calculateStats(data.nodes, data.members);
        },
        
        calculateStats(nodesList, membersList) {
            this.stats.totalNodes = nodesList.length;
            this.stats.totalMembers = membersList.length;
            this.stats.coverageArea = this.calculateCoverageArea(nodesList);
        },
        
        calculateCoverageArea(nodesList) {
            if (nodesList.length === 0) return 0;
            
            // Simple bounding box calculation for coverage area
            const lats = nodesList.map(node => node.location.lat);
            const lngs = nodesList.map(node => node.location.lng);
            
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            
            // Rough approximation of area in km²
            const latDiff = maxLat - minLat;
            const lngDiff = maxLng - minLng;
            const area = Math.round(latDiff * lngDiff * 12400); // Rough conversion factor
            
            return Math.max(area, 50); // Minimum 50 km²
        }
    }
}

// Nodes page data
function nodesData() {
    return {
        nodes: [],
        members: [],
        filteredNodes: [],
        selectedHardware: '',
        selectedRole: '',
        selectedOwner: '',
        showOnlineOnly: false,
        mapInitialized: false,
        map: null,
        markers: [],
        
        async init() {
            const data = await loadData();
            this.nodes = data.nodes;
            this.members = data.members;
            this.filteredNodes = [...this.nodes];
            
            // Initialize map after DOM is ready
            this.$nextTick(() => {
                this.initMap();
            });
        },
        
        get availableHardware() {
            return [...new Set(this.nodes.map(node => node.hardware))];
        },
        
        get availableOwners() {
            return [...new Set(this.nodes.map(node => node.memberId))].sort();
        },
        
        get onlineNodesCount() {
            return this.filteredNodes.filter(node => node.isOnline !== false).length;
        },
        
        get repeaterNodesCount() {
            return this.filteredNodes.filter(node => node.meshRole === 'repeater').length;
        },
    
        focusNodeOnMap(node) {
            if (this.map) {
                this.map.setView([node.location.lat, node.location.lng], 15);
            }
        },
        
        initMap() {
            if (this.mapInitialized || typeof L === 'undefined') return;
            
            // Default center
            const center = config.location?.center || { lat: 52.05917, lng: 1.15545 };
            const zoom = config.location?.zoom || 11;
            
            this.map = L.map('nodesMap').setView([center.lat, center.lng], zoom);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            this.updateMapMarkers();
            this.mapInitialized = true;
        },
        
        updateMapMarkers() {
            if (!this.map) return;
            
            // Clear existing markers
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers = [];
            
            // Add markers for filtered nodes
            this.filteredNodes.forEach(node => {
                const marker = L.marker([node.location.lat, node.location.lng])
                    .bindPopup(`
                        <strong>${node.name}</strong><br>
                        ${node.location.description}<br>
                        <em>ID:</em> ${node.id}<br>
                        <em>Hardware:</em> ${node.hardware}<br>
                        <em>Role:</em> ${node.meshRole}<br>
                        <em>Elevation:</em> ${node.elevation}m
                    `);
                    
                marker.addTo(this.map);
                this.markers.push(marker);
            });
        },
        
        applyFilters() {
            this.filteredNodes = this.nodes.filter(node => {
                const hardwareMatch = !this.selectedHardware || 
                    node.hardware.toLowerCase().includes(this.selectedHardware.toLowerCase());
                const roleMatch = !this.selectedRole || 
                    node.meshRole === this.selectedRole;
                const ownerMatch = !this.selectedOwner || 
                    node.memberId === this.selectedOwner;
                const onlineMatch = !this.showOnlineOnly || node.isOnline !== false;
                
                return hardwareMatch && roleMatch && ownerMatch && onlineMatch;
            });
            
            this.updateMapMarkers();
        },
        
        getMemberName(memberId) {
            const member = this.members.find(m => m.id === memberId);
            return member ? member.name : 'Unknown';
        },
        
        getUniqueHardware() {
            return [...new Set(this.nodes.map(node => node.hardware))];
        },
        
        getUniqueRoles() {
            return [...new Set(this.nodes.map(node => node.meshRole))];
        }
    }
}

// Members page data
function membersData() {
    return {
        members: [],
        nodes: [],
        
        async init() {
            const data = await loadData();
            this.members = data.members;
            this.nodes = data.nodes;
        },
        
        getNodeCount(memberId) {
            return this.nodes.filter(node => node.memberId === memberId && node.isPublic).length;
        },
        
        formatDate(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long'
            });
        },
        
        getAvatarUrl(avatarPath) {
            if (!avatarPath) return '';
            const pathPrefix = getPathPrefix();
            return pathPrefix + avatarPath;
        }
    }
}

// Contact page data
function contactData() {
    return {
        config: {},
        
        async init() {
            const data = await loadData();
            this.config = data.config;
        }
    }
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Dark mode persistence
document.addEventListener('alpine:init', () => {
    Alpine.store('darkMode', {
        on: true,
        
        init() {
            // Sync with the class that was already applied in head
            this.on = document.documentElement.classList.contains('dark');
        },
        
        toggle() {
            this.on = !this.on;
            localStorage.setItem('darkMode', this.on);
            
            // Update document class immediately
            if (this.on) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    });
});