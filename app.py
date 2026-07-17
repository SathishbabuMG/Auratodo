import os
import json
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')

DEFAULT_DATA = {
    "tasks": [
        {
            "id": "task-1",
            "title": "Welcome to AuraFlow! ✨",
            "description": "This is a task card. Drag it to another column to update its status or click to edit.",
            "status": "todo",
            "created_at": "2026-07-17T23:35:58"
        },
        {
            "id": "task-2",
            "title": "Start Pomodoro Timer ⏱️",
            "description": "Click the circular timer on the left to start a 25-minute focus session. Try turning on ambient soundscapes!",
            "status": "in-progress",
            "created_at": "2026-07-17T23:35:58"
        },
        {
            "id": "task-3",
            "title": "Stay Mindful 🧘",
            "description": "Completed your tasks? Drag them here to mark them as done and build your focus streak.",
            "status": "done",
            "created_at": "2026-07-17T23:35:58"
        }
    ],
    "stats": {
        "completed_pomodoros": 0,
        "focus_minutes": 0,
        "tasks_completed": 1
    }
}

def load_data():
    if not os.path.exists(DATA_FILE):
        save_data(DEFAULT_DATA)
        return DEFAULT_DATA
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {DATA_FILE}: {e}")
        return DEFAULT_DATA

def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing to {DATA_FILE}: {e}")
        return False

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/data', methods=['GET'])
def get_all_data():
    return jsonify(load_data())

@app.route('/api/data', methods=['POST'])
def save_all_data():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    if save_data(data):
        return jsonify({"status": "success", "data": data})
    else:
        return jsonify({"error": "Failed to save data"}), 500

if __name__ == '__main__':
    # Run server on port 5000 in debug mode
    app.run(host='127.0.0.1', port=5000, debug=True)
