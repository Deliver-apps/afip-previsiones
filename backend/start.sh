# start.sh
#!/bin/bash
while true; do
  node app.js
  echo "Restarting app..."
  sleep 2 # Add a short delay before restarting (optional)
done
