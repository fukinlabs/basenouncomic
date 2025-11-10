#!/bin/bash
# Script to add PINATA_JWT to Vercel environments

# JWT Token
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NWYxYjQxZC1mNjNiLTQ2NzAtOTkwNi00MTI5YTEzY2UxODMiLCJlbWFpbCI6ImZ1a2lubGFic0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMzJiZjIxYzk4ZDY5YjMzN2YwMzEiLCJzY29wZWRLZXlTZWNyZXQiOiIzNGYwMTk5NTQxMDQwOGEzNzc5NTJlMjdhZjYyOTIzYzQ1MmVlZTI4NjYzNGVmN2IwMWFmYmFiYTQzM2U4OTY3IiwiZXhwIjoxNzk0MTI5MTM2fQ.NEmeTYEsGp3PMywEyCc_SWIHmGTgYJH62tPJOYunp8k"

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

