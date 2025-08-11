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

// Simple navigation utilities
const Router = {
    // Navigate to node route
    navigateToNode(area, nodeId) {
        const url = `/nodes/${area}/${nodeId}`;
        window.location.href = url;
    }
};

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
        showTesting: false,
        mapInitialized: false,
        map: null,
        markers: [],
        markerClusterGroup: null,
        
        async init() {
            const data = await loadData();
            this.nodes = data.nodes;
            this.members = data.members;
            
            // Make this component globally accessible for popup buttons
            window.nodesPageInstance = this;
            
            this.applyFilters();
            
            // Initialize map after DOM is ready
            this.$nextTick(() => {
                setTimeout(() => {
                    this.initMap();
                }, 100);
            });
        },
        
        // Navigate to node details page (simpler server-side approach)
        navigateToNodeDetails(node) {
            const nodeIdParts = node.id.split('.');
            const shortId = nodeIdParts[0]; // e.g. "rep01" from "rep01.ip3.ipnt.uk"
            const area = node.area.toLowerCase(); // e.g. "ip3"
            
            // Direct navigation to server route
            window.location.href = `/nodes/${area}/${shortId}`;
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
            // Also navigate to the node page
            this.navigateToNode(node);
            
            // Scroll to top after a brief delay to allow DOM updates
            setTimeout(() => {
                window.scrollTo({ 
                    top: 0, 
                    behavior: 'smooth' 
                });
            }, 100);
        },
        
        initMap() {
            if (this.mapInitialized || typeof L === 'undefined') return;
            
            // Calculate bounds from filtered nodes
            const nodesWithLocation = this.filteredNodes.filter(node => 
                node.showOnMap && node.location && node.location.lat && node.location.lng
            );
            
            let center, zoom;
            if (nodesWithLocation.length > 0) {
                const bounds = L.latLngBounds(nodesWithLocation.map(node => [node.location.lat, node.location.lng]));
                center = bounds.getCenter();
                // Calculate appropriate zoom level
                zoom = nodesWithLocation.length === 1 ? 13 : 11;
            } else {
                // Fallback to config or default
                center = config.location?.center || { lat: 52.05917, lng: 1.15545 };
                zoom = config.location?.zoom || 11;
            }
            
            this.map = L.map('nodesMap').setView([center.lat, center.lng], zoom);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            this.mapInitialized = true;
            
            // Wait for map to be ready before initializing cluster group
            this.map.whenReady(() => {
                // Add a small delay to ensure everything is fully initialized
                setTimeout(() => {
                    // Initialize marker cluster group after map is ready
                    if (typeof L.markerClusterGroup !== 'undefined') {
                        this.markerClusterGroup = L.markerClusterGroup({
                            chunkedLoading: true,
                            maxClusterRadius: 50,
                            spiderfyOnMaxZoom: false, // Disable spiderfy to avoid map access issues
                            showCoverageOnHover: false,
                            zoomToBoundsOnClick: false, // Disable zoom to bounds to prevent map access issues
                            disableClusteringAtZoom: 16, // Disable clustering at high zoom levels
                            animate: false // Disable animations to prevent timing issues
                        });
                        this.map.addLayer(this.markerClusterGroup);
                        
                        // Add custom cluster click handler to avoid zoom issues
                        this.markerClusterGroup.on('clusterclick', (e) => {
                            try {
                                // Simple zoom in instead of bounds fitting
                                const currentZoom = this.map.getZoom();
                                if (currentZoom < 15) {
                                    this.map.setView(e.latlng, currentZoom + 2);
                                }
                            } catch (error) {
                                console.warn('Error handling cluster click:', error);
                            }
                        });
                    }
                    
                    this.updateMapMarkers();
                    this.fitMapToNodes();
                }, 100);
            });
        },
        
        fitMapToNodes() {
            if (!this.map) return;
            
            const nodesWithLocation = this.filteredNodes.filter(node => 
                node.showOnMap && node.location && node.location.lat && node.location.lng
            );
            
            if (nodesWithLocation.length > 1) {
                try {
                    const bounds = L.latLngBounds(nodesWithLocation.map(node => [node.location.lat, node.location.lng]));
                    this.map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
                } catch (error) {
                    console.warn('Error fitting map to nodes:', error);
                }
            } else if (nodesWithLocation.length === 1) {
                const node = nodesWithLocation[0];
                this.map.setView([node.location.lat, node.location.lng], 13);
            }
        },
        
        updateMapMarkers() {
            if (!this.map) return;
            
            try {
                // Clear existing markers
                if (this.markerClusterGroup) {
                    this.markerClusterGroup.clearLayers();
                } else {
                    this.markers.forEach(marker => {
                        if (this.map.hasLayer(marker)) {
                            this.map.removeLayer(marker);
                        }
                    });
                }
                this.markers = [];
            } catch (error) {
                console.warn('Error clearing markers:', error);
                this.markers = [];
            }
            
            // Use cluster group if available
            const useClusterGroup = this.markerClusterGroup;
            
            // Add markers for filtered nodes
            this.filteredNodes.forEach(node => {
                if (!node.showOnMap || !node.location || !node.location.lat || !node.location.lng) return;
                
                try {
                    // Create status indicator icon
                    let statusColor;
                    if (node.isTesting === true) {
                        statusColor = '#6633ff'; // blue for testing nodes
                    } else {
                        statusColor = node.isOnline !== false ? '#10b981' : '#ef4444'; // green for online, red for offline
                    }
                    const customIcon = L.divIcon({
                        html: `<div style="background-color: ${statusColor};" class="w-6 h-6 rounded-full border-2 border-white shadow-lg"></div>`,
                        className: 'custom-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    const marker = L.marker([node.location.lat, node.location.lng], { icon: customIcon })
                        .bindTooltip(node.id, {
                            permanent: true,
                            direction: 'right',
                            offset: [15, 0],
                            className: 'node-tooltip'
                        })
                        .bindPopup(`
                            <div class="max-w-xs">
                                <strong class="text-lg">${node.name}</strong><br>
                                <div class="mt-2 space-y-1 text-sm">
                                    <div><em>Owner:</em> ${this.getMemberName(node.memberId)}</div>
                                    <!--
                                    <div class="flex items-center mt-2">
                                        <div class="w-2 h-2 rounded-full mr-2" style="background-color: ${statusColor}"></div>
                                        <span class="font-medium">${node.isOnline !== false ? 'Online' : 'Offline'}</span>
                                    </div>
                                    -->
                                </div>
                                <div class="mt-3 pt-2 border-t border-gray-200">
                                    <button onclick="window.nodesPageInstance.navigateToNodeDetails({id: '${node.id}', area: '${node.area}'})" class="text-primary hover:text-accent text-sm font-medium">
                                        View Node Details
                                    </button>
                                </div>
                            </div>
                        `, {
                            closeOnClick: false,
                            autoClose: false,
                            closeButton: true
                        });
                    
                    // Add to cluster group if clustering is enabled, otherwise directly to map
                    if (useClusterGroup) {
                        this.markerClusterGroup.addLayer(marker);
                    } else {
                        marker.addTo(this.map);
                    }
                    
                    this.markers.push(marker);
                } catch (error) {
                    console.warn('Error adding marker for node:', node.id, error);
                }
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
                const testingMatch = this.showTesting || node.isTesting !== true;
                return hardwareMatch && roleMatch && ownerMatch && onlineMatch && testingMatch;
            }).sort((a, b) => {
                // Sort by area first, then by ID
                const areaComparison = a.area.localeCompare(b.area);
                if (areaComparison !== 0) return areaComparison;
                
                // If areas are the same, sort by ID
                return a.id.localeCompare(b.id);
            });
            
            this.updateMapMarkers();
            this.fitMapToNodes();
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

// Global QR Code generation function
window.generateQRCode = function(nodeUri, canvasId) {
    if (!nodeUri || typeof qrcode === 'undefined') {
        console.error('Missing nodeUri or qrcode library not loaded');
        return;
    }
    
    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(nodeUri);
                qr.make();
                
                const ctx = canvas.getContext('2d');
                const borderSize = 20;
                const qrSize = 210;
                const totalSize = qrSize + (borderSize * 2);
                const modules = qr.getModuleCount();
                const cellSize = qrSize / modules;
                
                canvas.width = totalSize;
                canvas.height = totalSize;
                
                // Fill entire canvas with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, totalSize, totalSize);
                
                // Draw QR code with border offset
                ctx.fillStyle = '#000000';
                for (let row = 0; row < modules; row++) {
                    for (let col = 0; col < modules; col++) {
                        if (qr.isDark(row, col)) {
                            ctx.fillRect(
                                borderSize + (col * cellSize), 
                                borderSize + (row * cellSize), 
                                cellSize, 
                                cellSize
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('QR Code generation error:', error);
            }
        } else {
            console.error('Canvas element not found:', canvasId);
        }
    }, 100);
};

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