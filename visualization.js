import * as THREE from './modules/three.module.js';

var ptGeometry = new THREE.SphereGeometry( 10, 10, 10 );
var ptMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );

var Nx;
var Ny;

var dt;

var scene;
var nodes;

var pos;
var vel;
var acc;
var mass;


export function generateGridCloth(s, wth, hgt, numX, numY) {

    scene = s;
    nodes = [];

    Nx = numX;
    Ny = numY;

    pos = new Array(Ny);
    vel = new Array(Ny);
    acc = new Array(Ny);
    mass = new Array(Ny);

    dt = 0.1;

    var dx = wth / Nx;
    var dy = hgt / Ny;

    for(var y = 0; y < Ny; y++) {
        nodes.push([]);
        pos[y] = new Array(Ny);
        vel[y] = new Array(Nx);
        acc[y] = new Array(Ny);
        mass[y] = new Array(Ny);
        for(var x = 0; x < Nx; x++) {
            var newNode = new THREE.Mesh(ptGeometry, ptMaterial);
            newNode.position.x = x*dx;
            newNode.position.y = y*dy;
            scene.add(newNode);
            nodes[y].push(newNode);
            
            pos[y][x] = [x*dx, y*dy, 0];
            vel[y][x] = [0,0,0];
            acc[y][x] = [0,0,0];
            mass[y][x] = 1;
        }
    }

}


export function force(p1, p2, v1, v2) {

    var ks = 3
    var kd = 2
    var l0 = 50

    var p12 = new Array(3);
    var v12 = new Array(3);

    p12[0] = p1[0] - p2[0]
    p12[1] = p1[1] - p2[1]
    p12[2] = p1[2] - p2[2]

    v12[0] = v1[0] - v2[0]
    v12[1] = v1[1] - v2[1]
    v12[2] = v1[2] - v2[2]
    
    var l = Math.sqrt(p12[0]*p12[0] + p12[1]*p12[1] + p12[2]*p12[2])

    var p_dot_v = p12[0]*v12[0] + p12[1]*v12[1] + p12[2]*v12[2]

    var stat = - ks * (l - l0);
    var damp = - kd * (p_dot_v / l);
    var scalar = stat + damp;
    
    p12[0] /= l
    p12[1] /= l
    p12[2] /= l 

    var f = new Array(3);

    f[0] = scalar * p12[0];
    f[1] = scalar * p12[1];
    f[2] = scalar * p12[2];

    return f
}




function isStretchCoord(dx, dy) {
    if((dx == -1 && dy ==  0) 
    || (dx ==  1 && dy ==  0) 
    || (dx ==  0 && dy == -1)
    || (dx ==  0 && dy ==  1)) { return true; }

    return false;
}

function isSheerCoord(dx, dy) {
    if((dx == -1 && dy ==  0) 
    || (dx ==  1 && dy ==  0) 
    || (dx ==  0 && dy == -1)
    || (dx ==  0 && dy ==  1)) { return true; }

    return false;
}



export function getForce() {
    

    // traverse each node
    for(var y1 = 0; y1 < Ny; y1++) {
        for(var x1 = 0; x1 < Nx; x1++) {
            var p1 = pos[y1][x1];
            var v1 = vel[y1][x1];
            var m1 = mass[y1][x1];

            acc[y1][x1] = [0, -9.81, 0];

            // stretch springs
            for(var dx = -1; dx <= 1; dx++) {
                for(var dy = -1; dy <= 1; dy++) {
                    if(isStretchCoord(dx,dy)) {
                        var x2 = x1 + dx
                        var y2 = y1 + dy
                        if(x2 >= 0 && x2 < Nx && y2 >= 0 && y2 < Ny) {
                            var p2 = pos[y2][x2];
                            var v2 = vel[y2][x2];
                            var m2 = mass[y2][x2];

                            var f = force(p1,p2,v1,v2);
                            
                            acc[y1][x1][0] += f[0] / m1;
                            acc[y1][x1][1] += f[1] / m1;
                            acc[y1][x1][2] += f[2] / m1;

                            acc[y2][x2][0] += -1 * f[0] / m2;
                            acc[y2][x2][1] += -1 * f[1] / m2;
                            acc[y2][x2][2] += -1 * f[2] / m2;
                        }
                    }
                }
            }



            

            
            

        }

    }

    
    for(var y = 0; y < Ny; y++) {
        for(var x = 0; x < Nx; x++) {

            if(y != Ny-1) {

                vel[y][x][0] += acc[y][x][0]*dt;
                vel[y][x][1] += acc[y][x][1]*dt;
                vel[y][x][2] += acc[y][x][2]*dt;
    
                pos[y][x][0] += vel[y][x][0]*dt;
                pos[y][x][1] += vel[y][x][1]*dt;
                pos[y][x][2] += vel[y][x][2]*dt;

                nodes[y][x].position.x = pos[y][x][0];
                nodes[y][x].position.y = pos[y][x][1];
                nodes[y][x].position.z = pos[y][x][2];
            }
        }
    }
    

}


