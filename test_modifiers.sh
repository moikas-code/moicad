#!/bin/bash

# Test script for visualization modifiers in moicad

echo "🔧 Testing moicad visualization modifiers"
echo "========================================="

echo ""
echo "1. Basic cube (no modifier):"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}' | jq '.geometry.stats'

echo ""
echo "2. Root modifier (!) - should show only modified geometry:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(5); !sphere(10); cylinder(3,10);"}' | jq '.geometry.stats'

echo ""
echo "3. Debug modifier (#) - should have modifier info:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"#cube(10);"}' | jq '.geometry.modifier'

echo ""
echo "4. Transparent modifier (%) - should have modifier info:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"%cube(10);"}' | jq '.geometry.modifier'

echo ""
echo "5. Disable modifier (*) - should generate no geometry:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"*cube(10);"}' | jq '.success'

echo ""
echo "6. Multiple modifiers - last one wins:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"#cube(5); %sphere(8);"}' | jq '.geometry.modifier'

echo ""
echo "7. Complex shapes with modifiers:"
curl -s -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"#translate([5,0,0]) cube(5);"}' | jq '.geometry.modifier'

echo ""
echo "8. Parsing test - all modifiers in one statement:"
curl -s -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"!cube(10); #sphere(5); %cylinder(3,10); *translate([10,0,0]) cube(5);"}' | jq '.ast | map(select(.type == "modifier")) | length'

echo ""
echo "✅ All modifier tests completed!"