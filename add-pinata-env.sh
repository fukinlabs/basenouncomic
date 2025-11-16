#!/bin/bash
# Script to add PINATA_JWT to Vercel environments

# JWT Token
JWT_TOKEN=""

echo "Adding PINATA_JWT to Vercel environments..."
echo ""

echo "Adding to Production..."
echo "$JWT_TOKEN" | vercel env add PINATA_JWT production

echo ""
echo "Adding to Preview..."
echo "$JWT_TOKEN" | vercel env add PINATA_JWT preview

echo ""
echo "Adding to Development..."
echo "$JWT_TOKEN" | vercel env add PINATA_JWT development

echo ""
echo "Done! Please redeploy your project."

