<?php 
session_start();
if (!isset($_SESSION["id"])){$_SESSION["id"]=uniqid();}
?>
<!DOCTYPE html>
<html >
    <head>
        <meta charset="utf-8" />
        <title>Socket.io - Communication avec socket.io ! avec Régis & Max & Jonas & Valentin</title>
        <link rel="stylesheet" type="text/css" href="css/cadre.css" />
    </head>
    <body>
		<div id="Jeu" data-id="<?php echo $_SESSION["id"];?>">
			

			<nav id="NavGauche" >
				<form id='FormNom' autocomplete="off" ><input id='NomJoueur' autocomplete="off" /></form>
				<section id='Console' class="Scroll1"></section>
				<form id='FormMessagerie' autocomplete="off" ><input id='InputMessagerie' type="text" placeholder="écris ici ce que tu veux mais reste poli !" autocomplete="off"/></form>
				<section id='Log' class="Scroll1"></section>
				<!-- <a href='#' id='PokeTous'>Poke à tous</a><a href='#' id='ResetScore'>Reset score</a> -->
			</nav>
			<div id='BoiteCanvas'></div>
		</div>
	</body>
	<script src="js/socket.io.js"></script>
	<script src="js/jeu1.js"></script>

</html>
