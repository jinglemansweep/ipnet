from flask import Flask, render_template, request, jsonify
import json
import os

ASSETS_DIR = 'assets'

app = Flask(__name__, static_folder=ASSETS_DIR, template_folder='templates')

# Load data files
def load_json_data(filename):
    """Load JSON data from the assets/data directory"""
    try:
        with open(os.path.join(ASSETS_DIR, "data", filename), 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def get_data():
    """Load all data files"""
    config = load_json_data('config.json')
    nodes_data = load_json_data('nodes.json')
    members_data = load_json_data('members.json')
    
    # Filter public nodes and members
    nodes = [node for node in nodes_data.get('nodes', []) if node.get('isPublic', True)]
    members = [member for member in members_data.get('members', []) if member.get('isPublic', True)]
    
    return config, nodes, members

@app.route('/')
def home():
    """Home page"""
    config, nodes, members = get_data()
    
    # Calculate stats
    stats = {
        'totalNodes': len(nodes),
        'totalMembers': len(members),
        'coverageArea': calculate_coverage_area(nodes)
    }
    
    return render_template('index.html', config=config, nodes=nodes, members=members, stats=stats)

@app.route('/<area>/<node_id>')
def redirect_to_nodes(area, node_id):
    """Redirect short URL format to full nodes URL"""
    from flask import redirect, url_for
    return redirect(url_for('nodes', area=area, node_id=node_id), code=301)

@app.route('/nodes/')
@app.route('/nodes/<area>/<node_id>')
def nodes(area=None, node_id=None):
    """Nodes page with optional individual node view"""
    config, nodes, members = get_data()
    
    current_node = None
    if area and node_id:
        # Find the specific node
        full_node_id = f"{node_id}.{area}.ipnt.uk"
        current_node = next((node for node in nodes if node['id'] == full_node_id or node['id'] == node_id), None)
    
    return render_template('nodes.html', 
                         config=config, 
                         nodes=nodes, 
                         members=members,
                         current_node=current_node,
                         showing_individual_node=current_node is not None)

@app.route('/members/')
def members():
    """Members page"""
    config, nodes, members_list = get_data()
    return render_template('members.html', config=config, nodes=nodes, members=members_list)

@app.route('/contact/')
def contact():
    """Contact page"""
    config, nodes, members = get_data()
    return render_template('contact.html', config=config)

@app.route('/api/data')
def api_data():
    """API endpoint to serve data as JSON"""
    config, nodes, members = get_data()
    return jsonify({
        'config': config,
        'nodes': nodes,
        'members': members
    })

def calculate_coverage_area(nodes):
    """Calculate approximate coverage area in km²"""
    if not nodes:
        return 0
    
    # Extract coordinates
    coords = []
    for node in nodes:
        if node.get('location') and node['location'].get('lat') and node['location'].get('lng'):
            coords.append((node['location']['lat'], node['location']['lng']))
    
    if not coords:
        return 0
    
    # Simple bounding box calculation
    lats = [coord[0] for coord in coords]
    lngs = [coord[1] for coord in coords]
    
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    
    # Rough approximation of area in km²
    lat_diff = max_lat - min_lat
    lng_diff = max_lng - min_lng
    area = round(lat_diff * lng_diff * 12400)  # Rough conversion factor
    
    return max(area, 50)  # Minimum 50 km²

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)