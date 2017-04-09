//fix default modular arithmetic to make more sense:
Number.prototype.mod=function(n){return ((this%n)+n)%n;}

//HTML5 canvas init:
var cnvas = document.getElementById("gamecanvas");
var ctx = cnvas.getContext("2d");

function qsin(r){return Math.sin(r*Math.PI/128)}//Custom sine function
function qcos(r){return Math.cos(r*Math.PI/128)}//Custom cosine function

function vector(x, y) {//vector and stuff it can do...
 this.x = x;
 this.y = y;
 this.copy = function (v2){//copy v2 to vector
  this.x=v2.x;
  this.y=v2.y;
 }
 this.add = function (v2){//add v2 to vector
  this.x+=v2.x;
  this.y+=v2.y;
 }
 this.scale=function(s){//multiply by scalar s
  this.x*=s;
  this.y*=s;
 }
}

var v0 = new vector(0,0); //nullvector, affectionately named v0

function dirvec(r,s){return new vector(qcos(r)*s,qsin(r)*s);} //vector of magnitude s in direction (angle) r
                            //vrot(new vector(s,0),r); // <- maybe, but it might be slower

function vadd(v1, v2){return new vector(v1.x+v2.x, v1.y+v2.y);} //returns sum of 2 vectors
function vdiff(v1, v2){return new vector(v1.x-v2.x, v1.y-v2.y);}//returns difference of 2 vectors
function vdotp(v1, v2){return v1.x*v2.x+v1.y*v2.y;} //returns scalar product of two vectors
function vnorm(v){return vdotp(v,v);} //returns square of the norm of the vector
function vrot(v, r){ //returns vector rotated by angle r
 return new vector(v.x*qcos(r) - v.y*qsin(r),
                   v.x*qsin(r) + v.y*qcos(r));
}
function vscale(v, s){return new vector(v.x*s, v.y*s);}//returns vector scaled by scalar s

function tensorf(t, n, rot, v){//tensor friction: t-tangent, n-normal, rot-angle, v-velocity
 var c = qcos(rot); var s = qsin(rot);
 return new vector(
   -v.x*(t*c*c+n*s*s) - v.y*(t-n)*s*c,
   -v.x*(t-n)*s*c     - v.y*(t*s*s+n*c*c));
}

function Mover(){ //Kinematic variables of stuff that moves. Init with default values 0.
 this.pos=new vector(0,0);
 this.vel=new vector(0,0);
 this.acc=new vector(0,0);
 this.rot=0;
 this.rotv=0;
 this.rota=0;
 this.update=function(){ //update position, velocity, etc.
  this.vel.add(this.acc); //apply acceleration to velocity
  this.pos.add(this.vel); //apply velocity to position
  this.rotv+=this.rota; //apply angular acceleration to a. velocity
  this.rot+=this.rotv; //apply a. velocity to angle
  this.rot=this.rot.mod(256); //constrain angle within 0 and 2pi
 }
}

function Tank(){
 this.kin=new Mover(); //Kinematic variables
 this.accd=0; //player or bot pressed acceleration (ACCelerateD)
 this.rotd=0; //player or bot pressed rotation     (ROTateD)
 this.fire=false; //player or bot fired a bullet

 /*inertia*/ //(yet to be used)
 this.mass=0;  //mass (obviously)

 /*geometry*/ //(yet to be used)
 this.r=0; //radius

 /*weapons*/
 this.guns=[];

 /*friction*/
 this.nfric=0; //normal friction
 this.tfric=0; //tangential friction
 this.rfric=0; //rotational friction
 this.update=function(){
  this.kin.acc=dirvec(this.kin.rot, this.accd); //accelerate
  this.kin.acc.add(tensorf(this.tfric, this.nfric, this.kin.rot, this.kin.vel)); //friction
  this.kin.rota=this.rotd - this.kin.rotv*this.rfric; //rotation minus rotational friction
  this.kin.update();
  if(this.fire)for(var i=0; i<this.guns.length;i++){ //FIRE ALL WEAPONS!!!1!!111oneoneone
   this.guns[i].fire(this.kin.pos,this.kin.vel, this.kin.rot);
  }
 } 
}

function Gun(pos, vel){
 this.pos = pos;
 this.vel = vel;
 this.fire = function(tpos, tvel, trot){
  shots.push(new Mover); //Create a new bullet...
  shots[shots.length-1].pos=vadd(tpos,vrot(this.pos,trot)); //...at tank's position... 
  shots[shots.length-1].vel=vadd(tvel,vrot(this.vel,trot)); //...with some velocity.
 }
}



function manageinput(){ //input management - this needs some work...
 player.accd=kbstatus[38]-kbstatus[40]; //acceleration
 player.rotd=kbstatus[39]-kbstatus[37]; //rotation
 player.fire=(kbstatus[32]==1); //shooting
}

/*******************\
|** Keyboard init **|
\*******************/
/*
left arrow 	37
up arrow 	38
right arrow 	39
down arrow 	40
*/
var n, kbstatus = []; for (n=0; n<256; n++) kbstatus[n]=0;
window.addEventListener("keydown", function(e){kbstatus[e.keyCode]=1;}, false);
window.addEventListener("keyup"  , function(e){kbstatus[e.keyCode]=0;}, false);



/*******************\
|** Game var init **|
\*******************/
var player=new Tank; //player init
player.tfric=0.05;
player.nfric=0.5;
player.rfric=0.2;
player.kin.pos = new vector(100,300);
//var gunpos=new vector(20,0);
//var gunvel=new vector(5,0);
//player.guns.push(new Gun(gunpos, gunvel));
player.guns.push(new Gun(new vector(20, 0), new vector(5,0)));
player.guns.push(new Gun(new vector(0, 20), new vector(4,3)));
player.guns.push(new Gun(new vector(0, -20), new vector(4,-3)));


//just a random shape of the tank to draw:
shape1 = [
new vector(  20,  10),
new vector( -20,  20),
new vector( -20, -20),
new vector(  20, -10)
];

//bullets
var shots = [];

//just some random destructable tiles:
var tilesize = 40;
var x, y, tilemap = [];
for(x=0;x<100;x++){
 tilemap[x]=[];
 for(y=0;y<100;y++) tilemap[x][y]=Math.floor(Math.random() * 2 + 1);
}



/*****************\
|** Camera init **|
\*****************/
var cam = new Mover; //Camera. Init at the player's position.
cam.pos.copy(player.kin.pos);
var csize = new vector(cnvas.width, cnvas. height)
var maxx=cnvas.width;
var maxy=cnvas.height;
var framescale=1;
var ctrans=vdiff(vscale(csize,1/(2*framescale)), cam.pos);



/*******************\
|** GFX functions **|
\*******************/
//function cls(){ctx.clearRect(0, 0, csize.x, csize.y);}
function drawcirc(pos,r,style){ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,2*Math.PI);ctx.fillStyle=style;ctx.fill();}
function drawpoly(pos, rot, shape, style){
 ctx.beginPath();
 for(i = 0; i<shape.length; i++){
  loc=vadd(pos,vrot(shape[i],rot));
  if(i==0)ctx.moveTo(loc.x,loc.y);
  else    ctx.lineTo(loc.x,loc.y);
 }
 ctx.fillStyle=style;
 ctx.fill();
}
function drawrect(pos, size, style){
 ctx.beginPath();
 ctx.fillStyle=style;
 ctx.rect(pos.x,pos.y,size.x,size.y);
 ctx.fill();
}




/***************\
|** MAIN LOOP **|
\***************/
setInterval(function gameframe(){
 manageinput();
 player.update();

 //this remains messy for now...
 for (var i = 0; i < shots.length; i++){//update bullets' status and position
  destroy=false;
  shots[i].update(); //move them
  if((shots[i].pos.x<0)||(shots[i].pos.y<0)||
     (shots[i].pos.x>tilesize*100)||(shots[i].pos.y>tilesize*100))destroy=true;//destroy bullets out of the map
  x=Math.floor(shots[i].pos.x/tilesize);y=Math.floor(shots[i].pos.y/tilesize); 
  if((x>=0)&&(x<100)&&(y>=0)&&(y<100))
   if(tilemap[x][y]==1){tilemap[x][y]=0;destroy=true;} // destroy bullet and tile if collided
  if(destroy){shots.splice(i,1);i--;}//remove bullet from array and index--
 }

 /*GFX compute*/ //(compute camera position)
 cam.vel.copy(vscale(vdiff(vadd(player.kin.pos,vscale(player.kin.vel, 20)), cam.pos), 0.1));
 cam.update();
 framescale=1/(1+0.002*vnorm(player.kin.vel)); //compute zoom (less if going faster)

 /*GFX draw*/
 //cls();
 drawrect(v0,csize,"#011");

 //set camera:
 ctx.save(); 
 ctx.scale(framescale,framescale);
 ctrans=vdiff(vscale(csize,1/(2*framescale)), cam.pos);
 ctx.translate(ctrans.x, ctrans.y);

 drawrect(v0,new vector(tilesize*100,tilesize*100),"#020");

 //draw tiles:
 for(x=0;x<100;x++)for(y=0;y<100;y++){
  if(tilemap[x][y]==1) drawcirc(new vector(tilesize*(x+1/2),tilesize*(y+1/2)), tilesize/2,"#46f");
 }

 //draw tank (this is just a placeholder shape):
 drawcirc(player.kin.pos, 20,"#b60");
 drawpoly(player.kin.pos, player.kin.rot, shape1,"#ab4");

 //draw bullets:
 for (var i = 0; i < shots.length; i++) drawcirc(shots[i].pos, 10,"#bb4");

 ctx.restore(); 
}, 30); //new frame every 30 miliseconds
