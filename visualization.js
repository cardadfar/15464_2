import * as THREE from './modules/three.module.js';

var ptGeometry = new THREE.SphereGeometry( 3, 3, 3 );
var ptMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );


var meshGeometry = new THREE.Geometry();
var meshMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, side: THREE.DoubleSide} );

var Nx;
var Ny;

var dt;

var scene;
var nodes;

var pos_prev;
var acc_prev;

var pos;
var vel;
var acc;
var mass;

var ks;
var kd;
var l0;
var integrationType;

var nodeVisible;

var windStrength;

export function generateGridCloth(s, wth, hgt, numX, numY) {

    scene = s;
    nodes = [];

    Nx = numX;
    Ny = numY;

    nodeVisible = true;

    pos_prev = new Array(Ny);
    acc_prev = new Array(Ny);

    pos = new Array(Ny);
    vel = new Array(Ny);
    acc = new Array(Ny);
    mass = new Array(Ny);

    var dx = wth / Nx;
    var dy = hgt / Ny;

    for(var y = 0; y < Ny; y++) {
        nodes.push([]);

        pos_prev[y] = new Array(Nx);
        acc_prev[y] = new Array(Nx);

        pos[y] = new Array(Nx);
        vel[y] = new Array(Nx);
        acc[y] = new Array(Nx);
        mass[y] = new Array(Nx);
        for(var x = 0; x < Nx; x++) {
            var newNode = new THREE.Mesh(ptGeometry, ptMaterial);

            var px = (x-Nx/2)*dx;
            var py = y*dy;
            
            newNode.position.x = px;
            newNode.position.y = py;
            scene.add(newNode);
            nodes[y].push(newNode);
            
            meshGeometry.vertices.push( new THREE.Vector3( px, py, 0 ));

            pos_prev[y][x] = [px, py, 0];
            acc_prev[y][x] = [0, 0, 0];

            pos[y][x] = [px, py, 0];
            vel[y][x] = [0,0,0];
            acc[y][x] = [0,0,0];
            mass[y][x] = 1;
        }
    }


    for(var y = 0; y < Ny-1; y++) {
        for(var x = 0; x < Nx-1; x++) {
            var a = (y  )*Nx + (x  );
            var b = (y  )*Nx + (x+1);
            var c = (y+1)*Nx + (x  );
            var d = (y+1)*Nx + (x+1);
            meshGeometry.faces.push( new THREE.Face3(d, a, c) );
            meshGeometry.faces.push( new THREE.Face3(a, b, d) );
        }
    }

    meshGeometry.computeBoundingSphere();
    var mesh = new THREE.Mesh(meshGeometry, meshMaterial);

    scene.add(mesh);

}


export function updateClothParams(params) {

    ks = params.ks;
    kd = params.kd;
    dt = params.dt;
    l0 = params.l0;
    integrationType = params.integrationType;
    windStrength = params.wind;

    if(nodeVisible != params.nodeVisible) {
        nodeVisible = params.nodeVisible;
        for(var y = 0; y < Ny; y++) {
            for(var x = 0; x < Nx; x++) {
                nodes[y][x].material.visible = nodeVisible;
            }
        }
    }

}


export function force(p1, p2, v1, v2, springType) {

    var l_orig = l0;

    if(springType == 1) { // stretch spring
        l_orig *= 1;
    }
    else if(springType == 2) { // shear spring
        l_orig *= Math.sqrt(2);
    }
    else if(springType == 3) { // bend spring
        l_orig *= 2;
    }

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

    var stat = - ks * (l - l_orig);
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
    if((dx == -1 && dy == -1) 
    || (dx == -1 && dy ==  1) 
    || (dx ==  1 && dy == -1)
    || (dx ==  1 && dy ==  1)) { return true; }

    return false;
}

function isBendingCoord(dx, dy) {
    if((dx == -2 && dy ==  0) 
    || (dx ==  2 && dy ==  0) 
    || (dx ==  0 && dy == -2)
    || (dx ==  0 && dy ==  2)) { return true; }

    return false;
}



export function getForce() {
    

    // traverse each node
    var newWind = (Math.random()-0.5)*windStrength;
    var wind = acc[0][0][2] + newWind;
    for(var y = 0; y < Ny; y++) {
        for(var x = 0; x < Nx; x++) {
            acc_prev[y][x] = acc[y][x].slice();
            acc[y][x] = [0, -9.81, newWind];
        }
    }

    console.log(wind, newWind);


    for(var y1 = 0; y1 < Ny; y1++) {
        for(var x1 = 0; x1 < Nx; x1++) {
            var p1 = pos[y1][x1];
            var v1 = vel[y1][x1];
            var m1 = mass[y1][x1];

            for(var dx = -2; dx <= 2; dx++) {
                for(var dy = -2; dy <= 2; dy++) {

                    var type = 0;
                    if(isStretchCoord(dx,dy)) {
                        type = 1;
                    }
                    else if(isSheerCoord(dx, dy)) {
                        type = 2;
                    }
                    else if(isBendingCoord(dx,dy)) {
                        type = 3;
                    }

                    if(type > 0) {
                        var x2 = x1 + dx
                        var y2 = y1 + dy
                        if(x2 >= 0 && x2 < Nx && y2 >= 0 && y2 < Ny) {
                            var p2 = pos[y2][x2];
                            var v2 = vel[y2][x2];
                            var m2 = mass[y2][x2];

                            var f = force(p1,p2,v1,v2,type);
                            
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

}


export function integrate() {

    for(var y = 0; y < Ny; y++) {
        for(var x = 0; x < Nx; x++) {

            if(y == Ny-1 ) { }
            else {

                var idx = y*Nx + x;
                var temp = pos[y][x].slice()

                // forward euler
                if(integrationType == 0) {

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

                // semi-implicit euler
                else if(integrationType == 1) {
                    
                    pos[y][x][0] += vel[y][x][0]*dt;
                    pos[y][x][1] += vel[y][x][1]*dt;
                    pos[y][x][2] += vel[y][x][2]*dt;

                    vel[y][x][0] += acc[y][x][0]*dt;
                    vel[y][x][1] += acc[y][x][1]*dt;
                    vel[y][x][2] += acc[y][x][2]*dt;

                    nodes[y][x].position.x = pos[y][x][0];
                    nodes[y][x].position.y = pos[y][x][1];
                    nodes[y][x].position.z = pos[y][x][2];
                }

                // verlet
                else if(integrationType == 2) {
                    
                    pos[y][x][0] = 2*pos[y][x][0] - pos_prev[y][x][0] + acc[y][x][0]*dt*dt;
                    pos[y][x][1] = 2*pos[y][x][1] - pos_prev[y][x][1] + acc[y][x][1]*dt*dt;
                    pos[y][x][2] = 2*pos[y][x][2] - pos_prev[y][x][2] + acc[y][x][2]*dt*dt;

                    nodes[y][x].position.x = pos[y][x][0];
                    nodes[y][x].position.y = pos[y][x][1];
                    nodes[y][x].position.z = pos[y][x][2];
                }

                // leapfrog
                else if(integrationType == 3) {

                    vel[y][x][0] += acc_prev[y][x][0]*dt/2;
                    vel[y][x][1] += acc_prev[y][x][1]*dt/2;
                    vel[y][x][2] += acc_prev[y][x][2]*dt/2;
                    
                    pos[y][x][0] += vel[y][x][0]*dt;
                    pos[y][x][1] += vel[y][x][1]*dt;
                    pos[y][x][2] += vel[y][x][2]*dt;

                    vel[y][x][0] += acc[y][x][0]*dt/2;
                    vel[y][x][1] += acc[y][x][1]*dt/2;
                    vel[y][x][2] += acc[y][x][2]*dt/2;

                    nodes[y][x].position.x = pos[y][x][0];
                    nodes[y][x].position.y = pos[y][x][1];
                    nodes[y][x].position.z = pos[y][x][2];
                }

                meshGeometry.vertices[idx].x = nodes[y][x].position.x;
                meshGeometry.vertices[idx].y = nodes[y][x].position.y;
                meshGeometry.vertices[idx].z = nodes[y][x].position.z;

                pos_prev[y][x] = temp;

            }
        }
    }

    meshGeometry.verticesNeedUpdate = true;
}