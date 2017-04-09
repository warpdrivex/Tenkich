//fix default modular arithmetic to make more sense:
Number.prototype.mod=function(n){return ((this%n)+n)%n;}

//HTML5 canvas init:
var cnvas = document.getElementById("gamecanvas");
var ctx = cnvas.getContext("2d");

/************\
	utils
\************/
function qsin(r){return Math.sin(r*Math.PI/128)}//Custom sine function
function qcos(r){return Math.cos(r*Math.PI/128)}//Custom cosine function

function vector(x, y) {//vector and stuff it can do...
 this.x = x;
 this.y = y;
 
 // ovaj copy je jako nezgodan, ime je obratno
 this.copy = function (v2){//copy v2 to vector
	  this.x = v2.x;
	  this.y = v2.y;
 }
 this.add = function (v2){//add v2 to vector
  this.x+=v2.x;
  this.y+=v2.y;
 }
 this.scale=function(lambda){//multiply by scalar
  this.x*=lambda;
  this.y*=lambda;
 }
 this.tensorf = function(t, n, rot){//Multiply by friction tensor. t=tangential, n=normal. Usually, t<n.
  var c = qcos(rot); var s = qsin(rot);
  this.add(new vector(
   -this.x*(t*c*c+n*s*s) - this.y*(t-n)*s*c,
   -this.x*(t-n)*s*c     - this.y*(t*s*s+n*c*c)
  ));
 }
}

function dirvec(r,s){return new vector(qcos(r)*s,qsin(r)*s);} //vector of magnitude s in direction (angle) r

function vadd(v1, v2){return new vector(v1.x+v2.x, v1.y+v2.y);} //returns sum of 2 vectors
function vdiff(v1, v2){return new vector(v1.x-v2.x, v1.y-v2.y);}//returns difference of 2 vectors
function vdotp(v1, v2){return v1.x*v2.x+v1.y*v2.y;} //returns scalar product of two vectors
function vnorm(v){return vdotp(v,v);} //returns square of the norm of the vector
function vrot(v, r){ //returns vector rotated by angle r
 return new vector(v.x*qcos(r) - v.y*qsin(r),
                   v.x*qsin(r) + v.y*qcos(r));
}
function vscale(v, s){return new vector(v.x*s, v.y*s);}//returns vector scaled by scalar s


/************\
 base classes 
\************/
function Mover(){ //Stuff that moves. Init with default values 0.
 /*Kinematic variables*/
 this.pos = new vector(0,0);
 this.vel = new vector(0,0);
 this.acc=new vector(0,0);
 this.rot=0;
 this.rotv=0;
 this.rota=0;

 /*inertia*/ //(yet to be used)
 this.mass=0;  //mass (obviously)
 this.eqrad=0; //equivallent radius (I=m*r^2)

 /*friction*/
 this.nfric=0; //normal friction
 this.tfric=0; //tangential friction
 this.rfric=0; //rotational friction

 this.update=function(){ //update position, velocity, etc.
  this.vel.tensorf(this.tfric, this.nfric, this.rot); //apply friction
  this.vel.add(this.acc); //apply acceleration to velocity
  this.pos.add(this.vel); //apply velocity to position
  this.rotv*=(1-this.rfric); //apply rotational friction
  this.rotv+=this.rota; //apply angular acceleration to a. velocity
  this.rot+=this.rotv; //apply a. velocity to angle
  this.rot=this.rot.mod(256); //constrain angle within 0 and 2pi
 }
	
 /*this.init = function(position, velocity) {
	// ovo bi trebal biti konstruktor a ne ovak
	// al je javascript jako jako fenomenalan supac jezik pa je kopiranje po vrijednosti
	// tolko trivijalno da izgubis sat vremena na njega i ne uspijes!
	this.pos = position;
	this.vel = velocity;
 }*/
}

function Input() {
	// takes care of input
	this.kbstatus = []

	// button press flags
	// NOTE: ideja ovih varijabli je da input podijelimo na 
	// flagove (bool), intervale (double) ili diskretne (int)
	// npr. tak da mozemo svakakve nacine pritiskanja pokupiti
	// TODO: mis bi isto trebal biti unutra
	// flags
	this.shoot = false;
	this.forward = false;
	this.back = false;
	
	// values
	this.rotate = 0;
	this.accel = 0;
	
	// called to get input for current frame
	this.update = function() {
		// TODO: key status should be updated here
		this.shoot = (this.kbstatus[32] == 1);
		this.rotate = this.kbstatus[39] - this.kbstatus[37];
		this.accel = g_playerInput.kbstatus[38] - g_playerInput.kbstatus[40];
	}
	
	// initializes key values
	this.init = function() {
		/*
			left arrow 	37
			up arrow 	38
			right arrow 	39
			down arrow 	40
		*/
		var n; 
		for (n = 0; n < 256; n++) 
			this.kbstatus[n] = 0;

		// TODO: read keys from config file
		_this = this;
		window.addEventListener("keydown", function(e){ _this.kbstatus[e.keyCode] = 1; }, false);
		window.addEventListener("keyup"  , function(e){ _this.kbstatus[e.keyCode] = 0; }, false);
	}
}

function GameMap() {
	// objekti bi trebali biti dio ovih klasa a ne globalne stvari
}

/*******************\
|** Game var init **|
\*******************/
var player = new Mover; //player init
player.tfric=0.05;
player.nfric=0.5;
player.rfric=0.2;
player.pos = new vector(100,300)

// input
// TODO: global variables should be prefixed with g_
g_playerInput = new Input();
g_playerInput.init()

//bullets
var shots = [];

//just some random destructable tiles:
var tilemap = [];
var x; var y;
for(x=0;x<100;x++){
 tilemap[x]=[];
 for(y=0;y<100;y++) tilemap[x][y]=Math.floor(Math.random() * 2 + 1);
}


var cam = new Mover; //Camera. Init at the player's position.
cam.pos.copy(player.pos);

var maxx=cnvas.width;
var maxy=cnvas.height;

var framescale=1;

//just a random shape of the tank to draw:
shape1 = [
new vector(  20,  10),
new vector( -20,  20),
new vector( -20, -20),
new vector(  20, -10)
];


/*******************\
|** Keyboard init **|
\*******************/

/*******************\
|** GFX functions **|
\*******************/
// TODO: isto u klasu, pa maknut u poseban fajl
function cls(){ctx.clearRect(0, 0, maxx, maxy);}
function drawcirc(pos,r,style){ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,2*Math.PI);ctx.fillStyle=style;ctx.fill();}
function drawpoly(pos, rot, shape, style){
 ctx.beginPath();
 for(i = 0; i<shape.length; i++){ //var i?, var loc?
  loc=vadd(pos,vrot(shape[i],rot));
  if(i==0)ctx.moveTo(loc.x,loc.y);
  else    ctx.lineTo(loc.x,loc.y);
 }
 ctx.fillStyle=style;
 ctx.fill();
}

/***************\
|** MAIN LOOP **|
\***************/
setInterval(function gameframe(){ 
 g_playerInput.update()
 player.acc = vrot(new vector(g_playerInput.accel, 0), player.rot);
 player.rota = g_playerInput.rotate
 player.update(); // TODO: ova dva pridruzivanja gore bi trebala ici u player.update
 // TODO: update fje primaju neki state koji im je potreban za update

 if(g_playerInput.shoot) {//shoot or something...
  var m = new Mover;
  m.pos.copy(player.pos); //...at player's position... 
  m.vel=vadd(player.vel,dirvec(player.rot,5)); //...with some velocity.
  shots.push(m); //Create a new bullet...
  
 }

 for (var i = 0; i < shots.length; i++){//update bullets' status and position
  destroy=false;
  shots[i].update(); //move them
  if((shots[i].pos.x<0)||(shots[i].pos.y<0)||
     (shots[i].pos.x>4000)||(shots[i].pos.y>4000))destroy=true;//destroy bullets out of the map
  x=Math.floor(shots[i].pos.x/40);y=Math.floor(shots[i].pos.y/40); 
  if((x>=0)&&(x<100)&&(y>=0)&&(y<100))
   if(tilemap[x][y]==1){tilemap[x][y]=0;destroy=true;} // destroy bullet and tile if collided
  if(destroy){shots.splice(i,1);i--;}//remove bullet from array and index--
 }


 /*GFX compute*/ //(compute camera position)
 cam.vel.copy(vscale(vdiff( vadd(player.pos,vscale(player.vel,20)) ,cam.pos),0.1));
 cam.update();
 framescale=1/(1+0.002*vnorm(player.vel)); //compute zoom (less if going faster)

 /*GFX draw*/
 cls();

 ctx.beginPath();
 ctx.fillStyle="#020";
 ctx.rect(0,0,maxx,maxy);
 ctx.fill();

 //set camera:
 ctx.save(); 
 ctx.scale(framescale,framescale);
 ctx.translate(-cam.pos.x+maxx/(2*framescale), -cam.pos.y+maxy/(2*framescale));

 //draw tiles:
 for(x = 0; x < 100; x++)
	 for(y = 0; y < 100; y++) {
		if(tilemap[x][y]==1) 
			drawcirc(new vector(x*40+20,y*40+20), 20,"#46f");
 }

 //draw tank (this is just a placeholder shape):
 drawcirc(player.pos, 20,"#b60");
 drawpoly(player.pos, player.rot, shape1,"#ab4");

 //draw bullets:
 for (var i = 0; i < shots.length; i++) drawcirc(shots[i].pos, 10,"#bb4");

 ctx.restore(); 
}, 30); //new frame every 30 miliseconds
