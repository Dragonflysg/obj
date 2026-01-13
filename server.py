from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

JSON_FILE = 'WIKI_SME.json'

@app.route('/update', methods=['POST'])
def update_wiki():
    try:
        # Get data from POST request
        data = request.get_json()

        id_value = data.get('id')
        title_value = data.get('title')
        sme_value = data.get('groupDropdown')
        reviewer_value = data.get('assigneeDropdown')

        print(f"Received data: id={id_value}, title={title_value}, sme={sme_value}, reviewer={reviewer_value}")

        # Read the JSON file
        if os.path.exists(JSON_FILE):
            with open(JSON_FILE, 'r') as f:
                wiki_data = json.load(f)
        else:
            wiki_data = []

        # Find if entry exists by matching id
        entry_found = False
        for entry in wiki_data:
            if entry.get('id') == id_value:
                # Update existing entry
                entry['title'] = title_value
                entry['sme'] = sme_value
                entry['reviewer'] = reviewer_value
                entry_found = True
                print(f"Updated existing entry with id={id_value}")
                break

        # If entry not found, add new entry
        if not entry_found:
            new_entry = {
                "id": id_value,
                "title": title_value,
                "sme": sme_value,
                "reviewer": reviewer_value,
                "currticket": "",
                "ticketstat": "",
                "assnee": "",
                "cycle": 90
            }
            wiki_data.append(new_entry)
            print(f"Added new entry with id={id_value}")

        # Save the updated data back to the file
        with open(JSON_FILE, 'w') as f:
            json.dump(wiki_data, f, indent=4)

        return jsonify({
            "status": "success",
            "message": "Data updated successfully",
            "entry_found": entry_found
        }), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
