// define State class
function State () {
	this._stateName = "";
}

State.prototype = {
	OnEnter: function() {
		this._root = new THREE.Object3D();
		scene.add( this._root );
	},

	OnExit: function() {
		scene.remove( this._root );
	},

	Update: function(dt) {

	}
};


function StateFirst () {
	this._stateName = "StateFirst";
}

StateFirst.prototype = new State();

StateFirst.prototype.OnEnter = function () {
	State.prototype.OnEnter.call( this );

	var geometry = new THREE.CubeGeometry( 5, 5, 5 );
	var material = new THREE.MeshLambertMaterial( { color: 0xFF0000 } );
	var mesh = new THREE.Mesh( geometry, material );
	this._root.add( mesh );
	this._cube = mesh;
}

StateFirst.prototype.Update = function (dt) {
	State.prototype.Update.call(this, dt);
}


var MAP_WIDTH = 100;
var MAP_HEIGHT = 100;

function StateGame () {
	this._stateName = "StateGame";
}

StateGame.prototype = new State();

StateGame.prototype.OnEnter = function () {
	State.prototype.OnEnter.call( this );

	this._conqueredMat1 = new THREE.MeshLambertMaterial( { color: 0xFF0000 } );
	this._conqueredMat2 = new THREE.MeshLambertMaterial( { color: 0xAA0000 } );

	this.CreateMap();
	this.CreatePlayer();
}

StateGame.prototype.Update = function (dt) {
	State.prototype.Update.call(this, dt);

	this.PlayerMoveByKeyboard(dt);
	this.KeepPlayerPositionInMap();
	this.ChangeColorFloor();
}

StateGame.prototype.CreateMap = function () {
	var mat1 = new THREE.MeshLambertMaterial( { color: 0x0000FF } );
	var mat2 = new THREE.MeshLambertMaterial( { color: 0x0000DD } );

	var geometry = new THREE.CubeGeometry( 1, 1, 1 );
	var mesh = new THREE.Mesh( geometry );

	this._floorMap = [];
	for( var i = 0; i < MAP_HEIGHT; i ++ ) {
		this._floorMap[i] = [];
		for( var j = 0; j < MAP_WIDTH; j ++ ) {
			var clone = mesh.clone();
			if( (i + j) % 2 === 0 ) {
				clone.material = mat1;
			}
			else {
				clone.material = mat2;
			}

			clone.position.set( j, 0, i );
			this._root.add( clone );
			this._floorMap[i][j] = clone;
			clone.changed = false;
		}
	}
}

StateGame.prototype.CreatePlayer = function () {
	var geometry = new THREE.CubeGeometry( 1, 3, 1 );
	geometry.computeBoundingBox();
	var material = new THREE.MeshLambertMaterial( { color: 0x00FF00 } );
	var mesh = new THREE.Mesh( geometry, material );
	mesh.position.set( 0, 1, 0 );
	this._root.add( mesh );
	this._player = mesh;
	this._player.position.set( MAP_WIDTH / 2, 1, MAP_HEIGHT / 2 );

	camera = new THREE.PerspectiveCamera(
		60, 
		window.innerWidth / window.innerHeight, 
		0.1, 
		1000);
	this._player.add( camera );
	camera.position.set( 0, 1, 0 );
	camera.lookAt( new THREE.Vector3( -1, 0, 0 ) );
	camera.rotateX( THREE.Math.degToRad( 10 ) );


	var light = new THREE.PointLight( 0xFFFFFF );
	light.position.set( 0, 20, 0 );
	this._player.add( light );
}

StateGame.prototype.PlayerMoveByKeyboard = function (dt) {
	if( keyboard.pressed('left') ) {
		this._player.rotateY( 5 * dt );
	}
	if( keyboard.pressed('right') ) {
		this._player.rotateY( -5 * dt );
	}

	var ry = this._player.rotation.y;
	if( Math.abs( this._player.rotation.x ) === Math.PI ) {
		ry = Math.PI - this._player.rotation.y;
	}

	var cos = Math.cos( ry );
	var sin = Math.sin( ry );
	var dir = new THREE.Vector3( -cos, 0, sin );
	dir.multiplyScalar( 3 * dt );
	this._player.position.add( dir );
}

StateGame.prototype.KeepPlayerPositionInMap = function () {
	if( this._player.position.x < 0 ) {
		this._player.position.x = 0;
	}
	if( this._player.position.x > MAP_WIDTH ) {
		this._player.position.x = MAP_WIDTH;
	}
	if( this._player.position.z < 0 ) {
		this._player.position.z = 0;
	}
	if( this._player.position.z > MAP_HEIGHT ) {
		this._player.position.z = MAP_HEIGHT;
	}
}

StateGame.prototype.ChangeColorFloor = function () {
	var x = parseInt( this._player.position.x + 0.5 );
	var y = parseInt( this._player.position.z + 0.5 );
	if( x >= MAP_WIDTH || x < 0 ) {
		return;
	}
	if( y >= MAP_HEIGHT || y < 0 ) {
		return;
	}

	var block = this._floorMap[y][x];
	if( block.changed ) {
		return;
	}

	if( (x + y) % 2 === 0 ) {
		block.material = this._conqueredMat1;
		block.changed = true;
	}
	else {
		block.material = this._conqueredMat2;
		block.changed = true;
	}
}



function StateManager() {
	var _curr = undefined;
}

StateManager.prototype = {
	SetState: function (state) {
		if( this._curr === undefined ) {
			var inst = this.InstantiateState(state);
			inst.OnEnter();

			this._curr = inst;
			return;
		}

		if( this._curr.stateName === state ) {
			return;
		}

		this._curr.OnExit();

		var inst = this.InstantiateState(state);
		inst.OnEnter();

		this._curr = inst;
	},

	InstantiateState: function (stateName) {
		var state;
		if( stateName === "StateFirst" ) {
			state = new StateFirst();
		}
		else if( stateName === "StateGame" ) {
			state = new StateGame();
		}

		return state;
	},

	Update: function (dt) {
		this._curr.Update( dt );
	}
};


var scene, camera, clock, renderer;

function Init () {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(
		75, 
		window.innerWidth / window.innerHeight, 
		0.1, 
		1000);
	camera.position.set( 15, 15, 15 );
	camera.lookAt( scene.position );

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0xeeeeee, 1.0 ); // the default
	renderer.setSize(window.innerWidth - 10, window.innerHeight - 20);
	document.body.appendChild(renderer.domElement);


	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var light = new THREE.PointLight( 0xFFFF00 );
	light.position.set( 10, 10, 10 );
	scene.add( light );

	var light2 = new THREE.PointLight( 0xFFFF00 );
	light2.position.set( 0, 0, 0 );
	scene.add( light2 );


	clock = new THREE.Clock();
}

console.log( window.innerWidth + " " + window.innerHeight );

CreateAxis = function (scene) {
	scene.add( new THREE.AxisHelper(1000) );
}

ProcessKeyInput = function (keyboard) {
	if( keyboard.pressed("1") ) {
		stateManager.SetState("StateFirst");
	}
	else if( keyboard.pressed("2") ) {
		stateManager.SetState("StateGame");
	}
}


Init();
CreateAxis(scene);

var keyboard = new THREEx.KeyboardState();
var stateManager = new StateManager();
stateManager.SetState("StateGame");

var render = function () {
	requestAnimationFrame(render);

	ProcessKeyInput(keyboard);

	var dt = clock.getDelta();
	stateManager.Update( dt );

	renderer.render(scene, camera);
};

render();