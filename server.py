from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load objectives data from JSON file
def load_objectives():
    json_path = os.path.join(os.path.dirname(__file__), 'objectives_data.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Save objectives data to JSON file
def save_objectives(objectives):
    json_path = os.path.join(os.path.dirname(__file__), 'objectives_data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(objectives, f, indent=4, ensure_ascii=False)

# Load roles data from JSON file
def load_roles():
    json_path = os.path.join(os.path.dirname(__file__), 'roles.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Format date - now just returns YYYY-MM-DD format as-is
def format_date(date_str):
    if not date_str:
        return ""
    # Since we're now using YYYY-MM-DD format consistently, just return as-is
    return date_str

objectives_data = load_objectives()
roles_data = load_roles()


@app.route('/api/objectives', methods=['POST'])
def get_objectives():
    """
    Get objectives filtered by assignee or owner and year.

    Expected JSON body:
    - For assignee view: {"assignee": "js1234", "year": 2024}
    - For owner view: {"owner": "js1234", "year": 2024}
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    year = data.get('year')
    assignee_id = data.get('assignee')
    owner_id = data.get('owner')

    # Filter objectives
    filtered_objectives = objectives_data

    # Filter by year if provided
    if year:
        filtered_objectives = [obj for obj in filtered_objectives if obj['year'] == year]

    # Filter by assignee or owner
    if assignee_id:
        filtered_objectives = [obj for obj in filtered_objectives if obj['assigneeID'] == assignee_id]
    elif owner_id:
        filtered_objectives = [obj for obj in filtered_objectives if obj['ownerID'] == owner_id]

    return jsonify({
        "success": True,
        "count": len(filtered_objectives),
        "objectives": filtered_objectives
    })


@app.route('/api/objectives/all', methods=['GET'])
def get_all_objectives():
    """
    Get all objectives without any filtering.
    Optionally filter by year using query parameter.

    Query parameters:
    - year (optional): Filter by year (e.g., ?year=2024)
    """
    year = request.args.get('year', type=int)

    if year:
        filtered_objectives = [obj for obj in objectives_data if obj['year'] == year]
    else:
        filtered_objectives = objectives_data

    return jsonify({
        "success": True,
        "count": len(filtered_objectives),
        "objectives": filtered_objectives
    })


@app.route('/api/roles', methods=['GET'])
def get_roles():
    """
    Get all roles (users who can be assignees or owners).
    Returns list of users with their name and id.
    """
    return jsonify({
        "success": True,
        "count": len(roles_data),
        "roles": roles_data
    })


@app.route('/api/objectives/create', methods=['POST'])
def create_objective():
    """
    Create a new objective.

    Expected JSON body:
    {
        "title": "Objective title",
        "description": "Objective description",
        "milestones": "Q1: Milestone 1\\nQ2: Milestone 2",
        "metrics": "Metric 1\\nMetric 2",
        "assigneeID": "js1234",
        "ownerID": "ed5521",
        "capital": "Company",
        "startDate": "2025-01-01",
        "targetDate": "2025-12-31",
        "year": 2025
    }
    """
    from datetime import datetime

    data = request.get_json()

    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    # Validate required fields
    required_fields = ['title', 'assigneeID', 'ownerID', 'startDate', 'targetDate', 'year']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

    # Reload objectives to get the latest data
    global objectives_data
    objectives_data = load_objectives()

    # Generate new ID
    max_id = max([obj['id'] for obj in objectives_data]) if objectives_data else 0
    new_id = max_id + 1

    # Get assignee and owner names from roles
    assignee_name = next((role['name'] for role in roles_data if role['id'] == data['assigneeID']), 'Unknown')
    owner_name = next((role['name'] for role in roles_data if role['id'] == data['ownerID']), 'Unknown')

    # Create new objective
    # Format current date for lastUpdated in YYYY-MM-DD format
    now = datetime.now()
    last_updated = now.strftime('%Y-%m-%d')

    new_objective = {
        "id": new_id,
        "title": data['title'],
        "status": "In Progress",
        "rag": "Green",
        "fromDate": format_date(data['startDate']),
        "toDate": format_date(data['targetDate']),
        "owner": owner_name,
        "ownerID": data['ownerID'],
        "assignee": assignee_name,
        "assigneeID": data['assigneeID'],
        "lastUpdated": last_updated,
        "year": data['year'],
        "milestones": data.get('milestones', ''),
        "metrics": data.get('metrics', ''),
        "monthlyUpdates": {}
    }

    # Add to objectives list
    objectives_data.append(new_objective)

    # Save to file
    save_objectives(objectives_data)

    return jsonify({
        "success": True,
        "message": "Objective created successfully",
        "objective": new_objective
    })


@app.route('/api/objectives/update/<int:objective_id>', methods=['PUT'])
def update_objective(objective_id):
    """
    Update an existing objective.

    Expected JSON body:
    {
        "status": "In Progress",
        "rag": "Green",
        "startDate": "2025-01-01",
        "targetDate": "2025-12-31",
        "milestones": "Q1: Milestone 1\\nQ2: Milestone 2",
        "metrics": "Metric 1\\nMetric 2",
        "monthlyUpdates": {
            "Jan": "January updates",
            "Feb": "February updates"
        }
    }
    """
    from datetime import datetime

    data = request.get_json()

    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    # Reload objectives to get the latest data
    global objectives_data
    objectives_data = load_objectives()

    # Find the objective to update
    objective_index = next((i for i, obj in enumerate(objectives_data) if obj['id'] == objective_id), None)

    if objective_index is None:
        return jsonify({"success": False, "error": "Objective not found"}), 404

    # Get the existing objective
    objective = objectives_data[objective_index]

    # Update fields if provided
    if 'status' in data:
        objective['status'] = data['status']
    if 'rag' in data:
        objective['rag'] = data['rag']
    if 'startDate' in data:
        objective['fromDate'] = format_date(data['startDate'])
    if 'targetDate' in data:
        objective['toDate'] = format_date(data['targetDate'])
    if 'milestones' in data:
        objective['milestones'] = data['milestones']
    if 'metrics' in data:
        objective['metrics'] = data['metrics']
    if 'monthlyUpdates' in data:
        objective['monthlyUpdates'] = data['monthlyUpdates']

    # Update lastUpdated to current date in YYYY-MM-DD format
    now = datetime.now()
    objective['lastUpdated'] = now.strftime('%Y-%m-%d')

    # Save to file
    save_objectives(objectives_data)

    return jsonify({
        "success": True,
        "message": "Objective updated successfully",
        "objective": objective
    })


@app.route('/api/objectives/delete/<int:objective_id>', methods=['DELETE'])
def delete_objective(objective_id):
    """
    Delete an objective by ID.
    """
    # Reload objectives to get the latest data
    global objectives_data
    objectives_data = load_objectives()

    # Find the objective to delete
    objective_index = next((i for i, obj in enumerate(objectives_data) if obj['id'] == objective_id), None)

    if objective_index is None:
        return jsonify({"success": False, "error": "Objective not found"}), 404

    # Remove the objective
    deleted_objective = objectives_data.pop(objective_index)

    # Save to file
    save_objectives(objectives_data)

    return jsonify({
        "success": True,
        "message": "Objective deleted successfully",
        "deletedId": objective_id
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Server is running"})


if __name__ == '__main__':
    print("Starting Objectives API Server...")
    print("Server running at http://localhost:5000")
    print("Endpoints:")
    print("  POST   /api/objectives              - Get filtered objectives")
    print("  GET    /api/objectives/all          - Get all objectives")
    print("  POST   /api/objectives/create       - Create new objective")
    print("  PUT    /api/objectives/update/<id>  - Update existing objective")
    print("  DELETE /api/objectives/delete/<id>  - Delete objective")
    print("  GET    /api/roles                   - Get all roles")
    print("  GET    /api/health                  - Health check")
    app.run(debug=True, port=5000)
