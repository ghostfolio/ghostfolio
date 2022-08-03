#!/bin/sh

#List all migration scripts based on folder name, and mark it as "applied"

for d in ./prisma/migrations/*/; do 
	mig=$(echo "$d" | sed 's/.\/prisma\/migrations\///' | sed 's/\///')
	yarn prisma migrate resolve --applied $mig
done