var http = require('http');
var fs = require('fs');

var server = http.createServer(function(req, res) {
    fs.readFile('./index.php', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});
var io = require('socket.io').listen(server);
server.listen(8080);
io.list=[];//liste de joueurs connectés (chat)

//définition du jeu (un pong)
var pong = {
	version:"0.171020",
	joueurs:[],//en jeu, tableau de Joueur()
	obstacles:[],
	balles:[],
	murs:[],
	service:0,
	status:0, //0:"stop", 1:"enAttente" , 2:"Play"
	config:{//pour initialisation
		positions:[new Vec2(-1,0),new Vec2(1,0)],//proc
		positionsInitiales:[],
		services:[],
		vitesseBalle:0.05,
		maxConnexions:2,
		balle:{
			radius:0.05,
			masse:1
		},
		raquette:{
			dimensionsInitiales:{largeur:0.05,longueur:0.5},
			vitesseMax: 50
		}
	}
};
var i,nbrConnexions=0,setTimeoutLoop;
var pts=[new Vec2(-1,1),new Vec2(1,1),new Vec2(1,-1),new Vec2(-1,-1)];

function start(){
	for(i=0;i<pong.config.maxConnexions;i++){

		//pong.config.positionsInitiales.push(pong.config.positions[i].clone().multiplyScalar(-1*pong.config.dimensionsCanvas.x/2).add(pong.config.raquette.taille[i].clone().multiply(pong.config.positions[i])));
		pong.config.positionsInitiales.push(pong.config.positions[i].clone().add(new Vec2(pong.config.raquette.dimensionsInitiales.largeur/2)));
		pong.config.services.push(pong.config.positions[i].clone().multiplyScalar(-1*pong.config.vitesseBalle));
	}
	//pong.balles.push(new Balle({radius:pong.config.balle.radius}));
	pong.balles.push(new Balle({radius:0.05,coeffRebond:1,position:new Vec2(0.12,0),vitesse:new Vec2().randomize().setLength(0.08)}));
	console.log("vitesse initiale : "+pong.balles[0].vitesse.x+","+pong.balles[0].vitesse.y);
	pong.murs.push(new Segment({start:pts[0],end:pts[1],rebond:true}));
	pong.murs.push(new Segment({start:pts[1],end:pts[2],rebond:true}));
	pong.murs.push(new Segment({start:pts[2],end:pts[3],rebond:true}));
	pong.murs.push(new Segment({start:pts[3],end:pts[0],onHit:perdage(1)}));
	
	function perdage(jp){
		return function perdu(){
			pong.status=1;console.log("perdu !!");pong.joueurs[jp-1].score++;
			pong.service++;if(pong.service>=pong.joueurs.length) pong.service=0;
			afficherScore();
		}
	}
	function retirerMursDuJoueur(joueur){
		var indexes=[];
		joueur.raquette.segments.forEach(function(s){
				pong.murs.forEach(function(m,index){
					if(m===s) indexes.push(index);
				});
		});
		indexes.forEach(function(i){
			pong.murs.splice(i,1);
		});
	}
	function afficherScore(){
	var msgScore=pong.joueurs.reduce(function(acc,j){return acc+j.nom+': '+j.score+'  ';},'score : ');
	io.emit('message',msgScore);
}
//*** *** *** still in start
io.sockets.on('connection', function (socket) {
	
	//nbrConnexions++;
	socket.emit('message','petitJeuIdiot v0.003 alpha. Bienvenue !');
	socket.emit('demandeId');	
	socket.on('ResetScore',function(){pong.joueurs.forEach(function(j){j.score=0;});afficherScore();});

	//handlers
	socket.on('envoiId',function(id){
		var joueurTest = io.list.find(comparerId(id));
		if(joueurTest) console.log(joueurTest.nom+" se reconnecte");
		socket.joueur = joueurTest || new Joueur(io.list.length+1,id,socket.id);socket.joueur.enJeu=false;
		io.list.push(socket.joueur);
		socket.broadcast.emit('message', socket.joueur.nom+' vient de se connecter !');console.log('Le client '+socket.joueur.nom+' est connecté ! cool !');
		socket.emit('majNom',socket.joueur.nom);
		socket.on('modifNom', function(val){io.emit('message',socket.joueur.nom+' a changé son nom en '+val);socket.joueur.nom=val;});
		socket.on('messageTous', function (message) {io.emit('message', socket.joueur.nom+': '+message);});
		socket.on('disconnect', function () {
			io.list.splice(io.list.findIndex(comparerId(id)),1);
			if(socket.joueur.enJeu){
				pong.joueurs.splice(pong.joueurs.findIndex(comparerId(id)),1);if(!pong.joueurs.length) pong.status=0;
				retirerMursDuJoueur(socket.joueur);
				//pong.obstacles.splice(pong.obstacles.findIndex(socket.joueur.raquette),1);
			}
			
			io.emit('message',socket.joueur.nom+" a été déconnecté, va savoir pourquoi...");console.log(socket.joueur.nom,' dégonnegdé');
		});
		socket.on('majAccel', function(a){socket.joueur.raquette.majAccel(a);});
		//socket.on('majPosition', function(dp){socket.joueur.maj(dp);});
		//socket.on('maj', function(pos){if(socket.joueur.enJeu){socket.joueur.maj(pos);}});
		socket.on('goInGame',function(){

			if(pong.joueurs.length<pong.config.maxConnexions && !socket.joueur.enJeu && pong.status!==2){
				var pgl=pong.joueurs.length;
				socket.joueur.playingPosition=pgl+1;
				socket.joueur.initRaquette();
				socket.joueur.enJeu=true;
				io.emit('message',socket.joueur.nom+' a rejoint le jeu');
				pong.joueurs.push(socket.joueur);
				socket.joueur.raquette.segments.forEach(function(s){if(s.rebond ||s.onHit) pong.murs.push(s);});
				//pong.obstacles.push(socket.joueur.raquette);
				pong.status=1;if(pong.joueurs.length==1){loop();console.log("loop start");}
				socket.emit('majPong',pong);
				socket.emit('enterInGame',socket.joueur);
				
			}else{ socket.emit('message','Il y a déjà '+pong.joueurs.length+' en jeu');}
			
			
		});
		socket.on('lancer balle',function(){
			if(pong.service==socket.joueur.playingPosition-1){
				
				//console.log(pong.config.services);
				var b=pong.balles[0];
				b.vitesse.randomizeFromVector(pong.config.services[socket.joueur.playingPosition-1]);
				pong.status=2;
			
			}		
		});
		socket.emit('majPong',pong);
		socket.emit('animationStart');
		
	});
});
}  // FIN start

function loop(){
	
	if(pong.status!==0){
		setTimeoutLoop=setTimeout(loop,16);
		pong.joueurs.forEach(function (j){j.raquette.maj();j.raquette.ralentir();});
	}else{console.log("loop stop");}
	
	if(pong.status===1){
		var p = pong.joueurs[pong.service];var v = pong.service===0?-1:1;
		if (p){
			pong.balles.forEach(function(b){
				b.position.set(p.raquette.position.x-v*(p.raquette.dimensions.largeur/2+b.radius),p.raquette.position.y);
				b.vitesseRotation=0;
				});
			}
	}
	if(pong.status===2){
		collisions();
	}	
	
	io.emit('majPong',pong);
}
function collisions(){
	pong.balles.forEach(function(b){
		var savedPosition=b.position.clone();
		var fp=savedPosition.clone().add(b.vitesse);
		var nc=0,fc=-1;
			
		pong.murs.forEach(function(mur,index){//doit stopper après le 1er ???
			var collision=mur.testCollision(b,fp);
			if(frameCount==0 && index==0) console.log(b.position,fp);
			//if(frameCount<200) S("dbg").innerHTML = collision.test;
			if(collision.test){
				nc++;
				if(fc==-1){
					fc=index;
					mur.pointDeContact=collision.pointDeContact;
					//S("dbg").innerHTML = mur.pointDeContact.x+" - "+mur.pointDeContact.y;
				}else{
					mur.pointDeContact={};
				}
			}
		});
		
		if(nc>2) console.log("collision triple darnitr");if(nc==2) console.log("collision double hahahahihihuhuhuhuhauhohohoho");
		if(nc && nc<=2){//collision double maxi
			S("dbg").innerHTML = "collision!!!  "+nc+"  "+fc;setTimeout(function(){S("dbg").innerHTML ="--";},2000);
			//var positionContact=b.rebondirSurSegment(pong.murs[fc],fp);//rebond ou perdu
			//limit bords ici
			/*var autreMur=pong.murs.find(function(mur){//doit stopper après le 1er ???
				return mur.testCollision(savedPosition,b.position);	
			});
			if(autreMur) b.rebondirSurSegment(autreMur,fp);//.......*/
		}
		if(!nc) b.position.add(b.vitesse);//.maj
		//b.position.copy(fp);	
		
	});
}

//** ** ***

//*** *** ***

function Segment(params){//point+normal ??
	//séparer dynamique ou non, même fct par frame
	this.start=params.start;this.end=params.end;
	this.rebond=params.rebond||false;
	this.coeffRebond=params.coeffRebond||1;
	this.onHit=params.onHit||undefined;
	this.pointDeContact={};//pos balle au contact
	this.calcVectors();
}
Segment.prototype.calcVectors=function(){
	this.directeur=new Vec2(this.end.x-this.start.x,this.end.y-this.start.y).normalize();
	this.normal=new Vec2(this.directeur.y,-this.directeur.x).normalize();//à droite (yd,-xd) ou (coeff,-1)
}
Segment.prototype.testCollision = function(balle,futurePos){
	var grosNombre=1e6, epsilon = 0.001;
	var vb=new Vec2(futurePos.x-balle.position.x,futurePos.y-balle.position.y);
	var db=vb.x==0?grosNombre:vb.y/vb.x;//iughikulghkl
	var ob=futurePos.y-db*futurePos.x;
	var ds=this.end.x==this.start.x?grosNombre:(this.end.y-this.start.y)/(this.end.x-this.start.x);
	var os=this.end.y-ds*this.end.x;
	var xc=(os-ob)/(db-ds);if(isNaN(xc)) console.log(" xc isNan : "+xc);
	var yc=xc*db+ob;//ds,os
	var pc = new Vec2(xc,yc);
	var dn=this.normal.x==0?grosNombre:this.normal.y/this.normal.x;
	var on=futurePos.y-dn*futurePos.x;
	var hfpx=(os-on)/(dn-ds);
	var hfpy=hfpx*dn+on;//or ds,os
	var hfp=new Vec2(hfpx,hfpy);
	var dfp = hfp.clone().sub(futurePos).getLength();
	
	//nv vecteur vitesse
	var nv=balle.vitesse.clone().add(this.normal.clone().multiplyScalar(this.normal.dot(balle.vitesse)).multiplyScalar(-2)).multiplyScalar(balle.coeffRebond*this.coeffRebond);
	//repositionnement
	// Thalès dfppc:distance fp-pc,dfp: distance fp-seg -> d:distance centre balle au contact-pc
	var dfppc=pc.clone().sub(futurePos).getLength();
	//var d=dfppc*(balle.radius+epsilon)/dfp;if(isNaN(d)) console.log(" d is NaN :",d);
	var d=dfppc*balle.radius/dfp;if(isNaN(d)) console.log(" d is NaN :",d,dfp,dfppc);
	//position balle au contact
	var pbc=new Vec2().copy(pc.clone().add(balle.vitesse.clone().multiplyScalar(-1).setLength(d)));
	//var pointDeContact = pbc.clone().add(this.normal.clone().multiplyScalar(-(balle.radius+epsilon)));
	var pointDeContact = pbc.clone().add(this.normal.clone().multiplyScalar(Math.sign(this.normal.dot(balle.vitesse))*balle.radius));
	var dist=pc.clone().sub(balle.position).getLength();
	var sign=balle.vitesse.getLength()<dist?-1:1;//devant ou derriere ?
	var diff=d+sign*dfppc;
	var np=pbc.clone().add(nv.clone().setLength(diff));
	
	var testDistance=dfp<balle.radius,k=0.9*balle.radius;
	var test1=pointDeContact.x>(Math.min(this.start.x,this.end.x)-k-epsilon);
	var test2=pointDeContact.x<(Math.max(this.start.x,this.end.x)+k+epsilon);
	var test3=pointDeContact.y>(Math.min(this.start.y,this.end.y)-k-epsilon);
	var test4=pointDeContact.y<(Math.max(this.start.y,this.end.y)+k+epsilon);
	var test=testDistance&&test1&&test2&&test3&&test4;
	
	if(this.rebond&&test){
		balle.position.copy(np);
		balle.vitesse.copy(nv);
	}
	if(this.onHit) this.onHit();
	//var ps=this.normal.x*vb.x+this.normal.y*vb.y;
	
	//if(frameCount<20) S("dbg").innerHTML = test1&&test2&&test3&&test4;
	return {test:test,pointDeContact:pointDeContact};
}
//**** ****
function Balle(params){//rond
	ObjetDynamique.call(this,params);
	this.radius = params.radius || 0.05;
	this.coeffRebond=params.coeffRebond||1;
	//this.masse=0;
}
Balle.prototype = Object.create(ObjetDynamique.prototype);
Balle.prototype.constructor=Balle;
Balle.prototype.rebondirSurSegment=function(seg,fp){//après test rebond, rebond à droite
	//modifie position et vitesse (et vitesseRotation)
	//ne pas soustraire futurepos et pos
	var pt1=seg.start,pt2=seg.end,pc=seg.pointDeContact;
	//sans radius pour l'instant
	//console.log(seg);
	//maj vitesse
	this.vitesse.add(seg.normal.clone().multiplyScalar(seg.normal.dot(this.vitesse)).multiplyScalar(-2));
	//position
	var lr=fp.clone().sub(pc).getLength();
	var np=pc.clone().add(this.vitesse.clone().normalize().multiplyScalar(lr));
	this.position.set(np.x,np.y);
	
	return new Vec2();//point de contact (centr balle)
}
function Obstacle(params){//rectangle ou polygone, n segments 1<=n
	params=params||{};
	ObjetDynamique.call(this,params);
	this.type=params.type||"raquette";
	this.dimensions=params.dimensions||{largeur:0.1,longueur:0.1};
	this.segments=[];//maj
}
Obstacle.prototype = Object.create(ObjetDynamique.prototype);
Obstacle.prototype.constructor=Obstacle;

Obstacle.prototype.majSegments=function(){//position actuelle, position future
	this.segments.forEach(function(s){
		
	});
}
//*** **
function ObjetDynamique(params){//un truc qui peut bouger, connaissance du monde ou pas ?
	params=params||{position:new Vec2()};
	this.position=params.position || new Vec2();
	this.vitesse=params.vitesse||new Vec2();
	this.vitesseMax=params.vitesseMax||0.2;//10% ecran
	this.acceleration= new Vec2();//this.accelerationMax=params.accelerationMax||0.1;
	this.rotation=0;
	this.vitesseRotation=0;
	this.limits={
		x:{},y:{}
	};
}
ObjetDynamique.prototype.limit=function(axis,valMin,valMax){
	this.limits[axis].min=valMin;this.limits[axis].max=valMax;
}
ObjetDynamique.prototype.maj=function(){//split
	
	this.vitesse.add(this.acceleration);
	this.vitesse.y=clamp(this.vitesse.y,-this.vitesseMax,this.vitesseMax); //faire avec length
	this.position.add(this.vitesse);
	this.position.y=clamp(this.position.y,this.limits.y.min+this.dimensions.longueur/2,this.limits.y.max-this.dimensions.longueur/2);//dim ?
	
}
ObjetDynamique.prototype.majAccel=function(a){
	this.acceleration.copy(a);
}
ObjetDynamique.prototype.ralentir=function(){
	this.vitesse.multiplyScalar(0.85);
	if(this.vitesse.getLength()<0.002) this.vitesse.zero();
	this.acceleration.multiplyScalar(0.85);
	if(this.acceleration.getLength()<0.002) this.acceleration.zero();
}
//*** ******
function Joueur(n,id,ids){
	this.nom = "Joueur"+n;
	this.raquette=new Obstacle({vitesseMax:pong.config.raquette.vitesseMax,type:"raquette"}); //ObjetDynamique, dimensions, angle
	
	this.playingPosition=undefined;//placé quand entre en jeu
	this.score=0;
	
	this.id=id;
	this.enJeu=false;
}
Joueur.prototype.initRaquette=function(jp){
	this.raquette.dimensions.largeur=pong.config.raquette.dimensionsInitiales.largeur;
	this.raquette.dimensions.longueur=pong.config.raquette.dimensionsInitiales.longueur;		
	this.raquette.position.copy(pong.config.positionsInitiales[this.playingPosition-1]);
	this.raquette.segments.push(new Segment({
		start:new Vec2().copy(this.raquette.position.clone().add(new Vec2(this.raquette.dimensions.largeur,this.raquette.dimensions.longueur).multiplyScalar(0.5)))//a refaire pour 3
		,end:new Vec2().copy(this.raquette.position.clone().add(new Vec2(this.raquette.dimensions.largeur,this.raquette.dimensions.longueur).multiply(new Vec2(0.5,-0.5))))
		,rebond:true}));
	this.raquette.limit("x",-1,1);
	this.raquette.limit("y",-1,1);
	
}
//*** ** ***
function comparerId(id){
	return function(el){return el.id===id;}
}
function clamp(x,xmin,xmax){return Math.min(xmax,Math.max(xmin,x));}
function distance(a,b){var dx=b.x-a.x,dy=b.y-a.y;return Math.sqrt(dx*dx+dy*dy);}
function cos(a,b){return (a.position.x-b.position.x)/(a.position.y-b.position.y);}


function Vec2(x,y){this.x=x||0;this.y=y||0;}
Vec2.prototype.getLength=function(){return Math.sqrt(this.x*this.x+this.y*this.y);}
Vec2.prototype.setLength=function(leng){return this.normalize().multiplyScalar(leng);}
Vec2.prototype.zero=function(){this.x=0;this.y=0;return this;}
Vec2.prototype.set=function(x,y){this.x=x;this.y=y; return this;}
Vec2.prototype.normalize=function(){var d = this.getLength();if(d!==0){return this.multiplyScalar(1/d);}else{return this.zero();}}
Vec2.prototype.add=function(p){this.x+=p.x;this.y+=p.y;return this;}
Vec2.prototype.sub=function(p){this.x-=p.x;this.y-=p.y;return this;}
Vec2.prototype.multiplyScalar=function(s){this.x*=s;this.y*=s;return this;}
Vec2.prototype.multiply=function(p){this.x*=p.x;this.y*=p.y;return this;}
Vec2.prototype.angle=function(){var angle = Math.atan2( this.y, this.x );if ( angle < 0 ) angle += Math.PI;return angle;}
Vec2.prototype.rotate=function(angle){return this.rotateAround(new Vec2(),angle);}
Vec2.prototype.rotateAround = function ( center, angle ) {

		var c = Math.cos( angle ), s = Math.sin( angle );

		var x = this.x - center.x;
		var y = this.y - center.y;

		this.x = x * c - y * s + center.x;
		this.y = x * s + y * c + center.y;

		return this;

}
Vec2.prototype.getVectorFromAngle=function(a){
	this.x=Math.cos(a);this.y=Math.sin(a);return this;
}
Vec2.prototype.copy=function(p){this.x=p.x;this.y=p.y;return this;}
Vec2.prototype.clone=function(){return new this.constructor(this.x,this.y);}
Vec2.prototype.randomize=function(){
	this.x=-1+2*Math.random();
	this.y=-1+2*Math.random();
	return this;
}
Vec2.prototype.randomizeFromVector=function(v){
	this.copy(v.clone().rotateAround(new Vec2(),-1+2*Math.random()));return this;
}
Vec2.prototype.constructor=Vec2;
//*** ** ***
function iRandom(n){return Math.floor(n*Math.random());}

start();
