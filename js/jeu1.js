(function(){

var frameCount=0;
function S(id) {return document.getElementById(id);}
window.addEventListener("load",function(){start();});

	
function start(){
	
	var consoleChat = S('Console'),consoleJeu = S('ConsoleJeu'),inputMsg = S('InputMessagerie'),inputNom = S('NomJoueur');
	var socket = io.connect('http://'+location.host+':8080');
	var pong={},joueur={};
	
	socket.on('demandeId',function(){console.log('demandeId de',JSON.stringify(S('Jeu').dataset));socket.emit('envoiId',S('Jeu').dataset.id);});
	socket.on('message', function(message) {consoleChat.innerHTML+='<p>'+ message+'</p>';consoleChat.scrollTop=consoleChat.scrollHeight;});
	socket.on('majNom', function(val){inputNom.value=val;});
	
	// S('ResetScore').onclick=function () {socket.emit('ResetScore');};
	// S('PokeTous').onclick=function () {socket.emit('messageTous', 'Salut les copains');};
	S('FormMessagerie').onsubmit=function(evt){ socket.emit('messageTous',inputMsg.value);inputMsg.value='';return false;};
	S('FormNom').onsubmit=function(){socket.emit('modifNom',inputNom.value);inputNom.blur();return false;};
	//window.onbeforeunload=function () {socket.emit('deconnexion', '');};
	socket.on("majPong",function(pongServer){pong=pongServer;});
	socket.on('animationStart',function(){animationLoop();});
	socket.on("enterInGame",function(joueurServer){
		//?
		console.log("entré en jeu : ",joueur);
	});
	
	var container = S('BoiteCanvas'),canvasWidth=650,canvasHeight=650;
	//jeu.canvasBG = document.createElement('canvas');jeu.canvasBG.width=canvasWidth;jeu.canvasBG.height=canvasHeight;jeu.canvasBG.ctx=jeu.canvasBG.getContext('2d');container.appendChild(jeu.canvasBG);
	var jeu={};
	jeu.canvas = document.createElement('canvas');jeu.canvas.width=canvasWidth;jeu.canvas.height=canvasHeight;
	jeu.canvas.ctx=jeu.canvas.getContext('2d');
	jeu.canvas.ctx.translate(canvasWidth/2,canvasWidth/2);jeu.canvas.ctx.scale(canvasWidth/2,-canvasHeight/2);//-1 1 -1 1
	container.appendChild(jeu.canvas);
	jeu.canvas.onclick=function(e){socket.emit('goInGame');};
	
	
	window.onkeydown=function(evt){
		if(evt.which==38){jeu.keyUp = true;}
		if(evt.which==39){jeu.keyRight = true;}
		if(evt.which==40){jeu.keyDown = true;}
		if(evt.which==37){jeu.keyLeft = true;}
		if(jeu.keyRight && pong.status===1 && joueur.enJeu){console.log("Lancer balle"); socket.emit('lancer balle');}
		//TODO:code inputs
	}
	window.onkeyup=function(evt){
		if(evt.which==38){jeu.keyUp = false;}
		if(evt.which==39){jeu.keyRight = false;}
		if(evt.which==40){jeu.keyDown = false;}
		if(evt.which==37){jeu.keyLeft = false;}
	}

	function animationLoop(){
		
		requestAnimationFrame(animationLoop);
		jeu.canvas.ctx.clearRect(-jeu.canvas.width/2,-jeu.canvas.height/2,jeu.canvas.width, jeu.canvas.height);
		//jeu.canvas.ctx.fillRect(-jeu.canvas.width/2,-jeu.canvas.height/2,jeu.canvas.width, jeu.canvas.height);
		
		
		if(jeu.keyDown){socket.emit("majAccel", {x:0,y:-0.05});}
		if(jeu.keyUp){socket.emit("majAccel", {x:0,y:0.05});}
		
		if(pong.joueurs[0]) S('Log').innerHTML=JSON.stringify(pong.joueurs[0].raquette.vitesse);
		
		if(pong.status!==0){
			pong.joueurs.forEach(function (j){dessinerRaquette(j);});
			pong.balles.forEach(function (b){dessinerBalle(b);});
		}
		frameCount++;
	}
	function dessinerRaquette(j){
		var i,index,r=j.raquette,ctx=jeu.canvas.ctx,p,tab=[[-1,1],[1,1],[1,-1],[-1,-1]];
		
		//jeu.canvas.ctx.fillRect(r.position.x-r.dimensions.x/2,r.position.y-r.dimensions.y/2,r.dimensions.x,r.dimensions.y);
		ctx.fillStyle="purple";
		ctx.beginPath();
		p={x:r.position.x+tab[0][0]*Math.cos(r.rotation)*r.dimensions.largeur/2,y:r.position.y+tab[0][1]*Math.sin(r.rotation)*r.dimensions.longueur/2};
		ctx.moveTo(p.x,p.y);
		for(i=1;i<5;i++){
			index=i%4;
			p.x=r.position.x+tab[index][0]*Math.cos(r.rotation)*r.dimensions.largeur/2;
			p.y=r.position.y+tab[index][1]*Math.sin(r.rotation)*r.dimensions.longueur/2;
			ctx.lineTo(p.x,p.y);
		}
		ctx.fill();
		if(frameCount%60==0) console.log(r.position);
	}
	function dessinerBalle(b){
		
		jeu.canvas.ctx.save();
		if (frameCount%1000==0) console.log(b);
		
		jeu.canvas.ctx.translate(b.position.x,b.position.y);
		jeu.canvas.ctx.rotate(b.rotation * Math.PI / 180);
		
		if (b.rebond) jeu.canvas.ctx.scale(0.5,1);
		
		jeu.canvas.ctx.beginPath();
		jeu.canvas.ctx.fillStyle="#000";
		jeu.canvas.ctx.moveTo(0,0);
		jeu.canvas.ctx.arc(0,0,b.radius,0,2*Math.PI);
		jeu.canvas.ctx.fill();
		jeu.canvas.ctx.fillStyle="#FF0000";
		jeu.canvas.ctx.fillRect(-b.radius/2,-b.radius/2,b.radius,b.radius);
		jeu.canvas.ctx.restore();
	}
	
	function dessinerBalle2(b){
		jeu.canvas.ctx.moveTo(b.position.x,b.position.y+b.radius);
		//jeu.canvas.ctx.arcTo(b.position.x+b.radius,b.position.y);
	}

}
})();

