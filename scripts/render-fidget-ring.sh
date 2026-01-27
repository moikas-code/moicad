#!/bin/bash
# Script to render fidget ring body and connector

echo "Rendering fidget ring body..."
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d @<(cat <<'EOF'
{
  "code": "$fa=30;$fs=2;$fn=24;base_radius=5;hole1_radius=5.5;solid1_radius=7;hole2_radius=7.5;solid2_radius=9;hole3_radius=9.5;solid3_radius=11;hole4_radius=11.5;solid4_radius=13;hole5_radius=13.5;solid5_radius=15;module hollow_sphere(idx){if(idx==1){difference(){sphere(r=solid1_radius);sphere(r=hole1_radius);}}else if(idx==2){difference(){sphere(r=solid2_radius);sphere(r=hole2_radius);}}else if(idx==3){difference(){sphere(r=solid3_radius);sphere(r=hole3_radius);}}else if(idx==4){difference(){sphere(r=solid4_radius);sphere(r=hole4_radius);}}else if(idx==5){difference(){sphere(r=solid5_radius);sphere(r=hole5_radius);}}}module cut_boxes(){translate([0,0,10])cube([30,30,10],center=true);translate([0,0,-10])cube([30,30,10],center=true);}module body(){difference(){union(){sphere(r=base_radius);hollow_sphere(1);hollow_sphere(2);hollow_sphere(3);hollow_sphere(4);hollow_sphere(5);}cut_boxes();}}body();"
}
EOF
) > /tmp/body_geometry.json

if [ $? -eq 0 ]; then
  echo "✓ Body rendered successfully"
  echo "  Stats:" $(jq -r '.geometry.stats | "vertices=\(.vertexCount) faces=\(.faceCount) volume=\(.volume)"' /tmp/body_geometry.json)
else
  echo "✗ Body rendering failed"
  exit 1
fi

echo ""
echo "Rendering connector..."
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"$fa=30;$fs=2;$fn=24;connector_outer_radius=5;connector_inner_radius=3.5;connector_height=6;connector_distance=18;module connector_ring(outer_r,inner_r,h,distance){translate([distance,0,0])difference(){cylinder(r=outer_r,h=h,center=true);cylinder(r=inner_r,h=h+1,center=true);}}module connector(){connector_ring(connector_outer_radius,connector_inner_radius,connector_height,connector_distance);}connector();"}' \
  > /tmp/connector_geometry.json

if [ $? -eq 0 ]; then
  echo "✓ Connector rendered successfully"
  echo "  Stats:" $(jq -r '.geometry.stats | "vertices=\(.vertexCount) faces=\(.faceCount) volume=\(.volume)"' /tmp/connector_geometry.json)
else
  echo "✗ Connector rendering failed"
  exit 1
fi

echo ""
echo "Exporting body to STL..."
jq '.geometry' /tmp/body_geometry.json | \
curl -X POST http://localhost:42069/api/export \
  -H "Content-Type: application/json" \
  -d @- \
  --data-urlencode "format=stl" \
  --data-urlencode "binary=true" \
  --output /tmp/fidget-ring-body.stl

echo "✓ Body exported to /tmp/fidget-ring-body.stl"

echo ""
echo "Exporting connector to STL..."
jq '.geometry' /tmp/connector_geometry.json | \
curl -X POST http://localhost:42069/api/export \
  -H "Content-Type: application/json" \
  -d @- \
  --data-urlencode "format=stl" \
  --data-urlencode "binary=true" \
  --output /tmp/fidget-ring-connector.stl

echo "✓ Connector exported to /tmp/fidget-ring-connector.stl"

echo ""
echo "Done! Files created:"
ls -lh /tmp/fidget-ring-*.stl
