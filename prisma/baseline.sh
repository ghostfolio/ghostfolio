#!/bin/sh

# List all migration scripts based on folder name, and mark it as "applied"

for directory in ./prisma/migrations/*/; do 
	migration=$(echo "$directory" | sed 's/.\/prisma\/migrations\///' | sed 's/\///')
	yarn prisma migrate resolve --applied $migration
done
