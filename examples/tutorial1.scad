// Constants
base_height=10;
body_roll=-5;
top_height=15;

track=20;

wheel_radius = 10;
wheel_width=8;
wheels_turn=20;
// IMPROVE RESOLUTION
$fa = 1;
$fs = 0.4;


//Body
scale([2,2,2]){
    rotate([body_roll,0,0]){
    //base
    cube([60,20,base_height],center=true);

    //hood
    translate([5,0,(base_height/2+top_height/2) - 0.001])
        cube([30,20,top_height],center=true);
    }
// Wheels
//Front Wheel L
translate([-20,-track,0])
    rotate([90,0,wheels_turn])
    cylinder(h=wheel_width,r=wheel_radius,center=true);

//Front Wheel R
translate([-20,track,0])
    rotate([90,0,wheels_turn])
    cylinder(h=wheel_width,r=wheel_radius,center=true);

//Front Wheel L
translate([20,-track,0])
    rotate([90,0,0])
    cylinder(h=wheel_width,r=wheel_radius,center=true);

//Front Wheel R
translate([20,track,0])
    rotate([90,0,0])
    cylinder(h=wheel_width,r=wheel_radius,center=true);

//Front axle
translate([-20,0,0])
    rotate([90,0,0])
    cylinder(h=track*2,r=2,center=true);

//Back axle
translate([20,0,0])
    rotate([90,0,0])
    cylinder(h=track*2,r=2,center=true);
}
