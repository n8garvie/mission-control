#!/usr/bin/env python3
"""
Process approved ideas for overnight build
Usage: python process-approved-ideas.py <json_file> <max_builds>
"""

import json
import sys

def main():
    if len(sys.argv) < 3:
        print("Usage: process-approved-ideas.py <json_file> <max_builds>", file=sys.stderr)
        sys.exit(1)
    
    json_file = sys.argv[1]
    max_builds = int(sys.argv[2])
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}", file=sys.stderr)
        sys.exit(1)
    
    for idea in data[:max_builds]:
        idea_id = idea.get('_id', '')
        title = idea.get('title', '').replace('|', ' ')
        description = idea.get('description', '').replace('\n', ' ').replace('|', ' ')
        target = idea.get('targetAudience', '').replace('|', ' ')
        mvp = idea.get('mvpScope', '').replace('\n', ' ').replace('|', ' ')
        potential = idea.get('potential', '')
        print(f"{idea_id}|{title}|{description}|{target}|{mvp}|{potential}")

if __name__ == '__main__':
    main()
