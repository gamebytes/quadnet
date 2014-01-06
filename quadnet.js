var quadnet = function(document, canvas_container) {
  var origin = new THREE.Vector3(0,0,0);
  var camera;
  
  var newRenderer = function() {
    try {
      return new THREE.WebGLRenderer();
    } catch(err) {
      return new THREE.CanvasRenderer();
    }
  };

  var renderer = newRenderer();
  renderer.setClearColor(new THREE.Color(0x000000));
  canvas_container.appendChild(renderer.domElement);

  (function() {

    var updateCamera = function() {
      var width = canvas_container.offsetWidth;
      var height = canvas_container.offsetHeight;

      var VIEW_ANGLE = 45,
        ASPECT = width / height,
        NEAR = 0.1,
        FAR = 10000;

      if (scene) scene.remove(camera);
      camera = new THREE.PerspectiveCamera(
        VIEW_ANGLE,
        ASPECT,
        NEAR,
        FAR);

      camera.position.z = 370;
      camera.lookAt(origin);
      if (scene) scene.add(camera);
      renderer.setSize(width, height);

    };

    updateCamera();
    window.onresize = function() {
      updateCamera();
    }
  })();

  var square = {left: -160, right: 160, top: 150, bottom: -150};
  var ship = Quadnet.objects.createShip();

  var scene = (function() { 
    var scene = new THREE.Scene();

    var grid = Quadnet.objects.createGrid(square);
    ship.position.set(0,0,1);
    scene.add(grid);
    scene.add(ship);
    scene.add(camera);

    var light =
      new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(2,1,0)

    scene.add(light);

    return scene;
  })();

  var game_state = (function(){
    var createBullet = Quadnet.objects.createBulletFactory();
    var createAsteroid = Quadnet.objects.createAsteroidFactory();

    var GameObject = function(object3d, x, y) {
      this.x = x;
      this.y = y;
    };

    GameObject.prototype = {
      x: 0,
      y: 0,
      radius: 10,
      think: function(){},
      ondestroy: function(callback) {
        this.ondestroy_callback = callback;
      } 
    };

    var Bullet = function(object3d, x, y, dx, dy) {
      GameObject.call(this,object3d, x, y);
      this.think = function(ticks) {
        this.y = this.y + dy * ticks;
        this.x = this.x + dx * ticks;

        if (this.x > 400||this.x < -400||this.y > 400||this.y < -400){
          scene.remove(object3d);
          this.ondestroy_callback.call(this);
        }

        object3d.position.x = this.x;
        object3d.position.y = this.y;
      };
    };
    Bullet.prototype = Object.create(GameObject.prototype);

    var Asteroid = function(object3d, x, y, dx, dy) {
      GameObject.call(this,object3d, x, y);
      // create a random rotation matrix
      var rotanglex = Math.random()*0.06-0.03;
      var rotangley = Math.random()*0.06-0.03;
      var rotanglez = Math.random()*0.06-0.03;

      this.think = function(ticks) {
        var nextx = this.x + dx * ticks;
        var nexty = this.y + dy * ticks;

        object3d.rotateX(rotanglex);
        object3d.rotateY(rotangley);
        object3d.rotateZ(rotanglez);

        if (nextx < square.left || nextx > square.right ) dx = -dx;
        if (nexty < square.bottom || nexty > square.top ) dy = -dy;

        if (nextx < square.left) nextx = nextx + (square.left - nextx) * 2;
        if (nexty < square.bottom) nexty = nexty + (square.bottom - nexty) * 2;
        if (nextx > square.right) nextx = nextx + (square.right - nextx) * 2;
        if (nexty > square.top) nexty = nexty + (square.top - nexty) * 2;

        this.x = nextx;
        this.y = nexty;
        object3d.position.x = this.x;
        object3d.position.y = this.y;
      };
    };
    Asteroid.prototype = Object.create(GameObject.prototype);

    return {
      objects: [],
      spawnShoot: function(x, y, dx, dy) {
        var object3d = createBullet();
        scene.add(object3d);
        var obj = new Bullet(object3d, x, y, dx, dy);
        obj.think(0);
        obj.ondestroy(function() {
          var i = game_state.objects.indexOf(this);
          if (i>-1){
            game_state.objects.splice(i,1);
          }
        });
        game_state.objects.push(obj);
      },

      spawnAsteroid: function() {

        var object3d = createAsteroid();

        var x, y, dx, dy;
        x = Math.random() * (square.right - square.left) + square.left;
        y = Math.random() * (square.top - square.bottom) + square.bottom;
        dx = (Math.round(Math.random()) - 0.5)*0.2;
        dy = (Math.round(Math.random()) - 0.5)*0.2;
        // randomize border
        switch(Math.floor(Math.random()*4)) {
          case 0.0:
            y = square.top;
            dy = -0.1;
            break;
          case 1.0:
            y = square.bottom;
            dy = 0.1;
            break;
          case 2.0:
            x = square.left;
            dx = 0.1;
            break;
          case 3.0:
            x = square.right;
            dx = -0.1;
            break;
        }


        object3d.position.set(x, y, 1.1);
        scene.add(object3d);
        var obj = new Asteroid(object3d, x, y, dx, dy);
        obj.ondestroy(function() {
          var i = game_state.objects.indexOf(this);
          if (i>-1){
            game_state.objects.splice(i,1);
          }
        });
        game_state.objects.push(obj);
        
      }
    };
  })();

  (function(){
    var implementShipControls = function(document, ship_state) {
      document.onkeydown = function(e){
        if (e.keyCode == 87) ship_state.shoot_up = true;
        if (e.keyCode == 83) ship_state.shoot_down = true;
        if (e.keyCode == 68) ship_state.shoot_right = true;
        if (e.keyCode == 65) ship_state.shoot_left = true;

        if (e.keyCode == 38) ship_state.up = true;
        if (e.keyCode == 39) ship_state.right = true;
        if (e.keyCode == 37) ship_state.left = true;
        if (e.keyCode == 40) ship_state.down = true;

        if (e.keyCode == 13) game_state.spawnAsteroid();
      };
      document.onkeyup = function(e){
        if (e.keyCode == 87) ship_state.shoot_up = false;
        if (e.keyCode == 83) ship_state.shoot_down = false;
        if (e.keyCode == 68) ship_state.shoot_right = false;
        if (e.keyCode == 65) ship_state.shoot_left = false;

        if (e.keyCode == 38) ship_state.up = false;
        if (e.keyCode == 39) ship_state.right = false;
        if (e.keyCode == 37) ship_state.left = false;
        if (e.keyCode == 40) ship_state.down = false;
      };
    }

    var Cannon = function() {
      var weapon_load = 0.0, weapon_heat = 0.0, weapon_cooldown = false;
      this.think = function(ticks){
        weapon_load = weapon_load + ticks;
        if (weapon_load > 30) {
          if (weapon_heat > 0.0) {
            weapon_heat -= 0.5;
          } else {
            weapon_cooldown = false;
          }
        }
      };

      this.spawnShoot = function(x, y, dx, dy) {
        if (weapon_load > 30 && weapon_heat < 10 && !weapon_cooldown) {
          game_state.spawnShoot(x, y, dx, dy);
          weapon_heat = weapon_heat + 1.5;
          if (weapon_heat > 10) {
            weapon_cooldown = true;
          }
          weapon_load = 0.0;
        }
      }
    };

    Cannon.prototype = {
      weapon_heat: 0.0,
      weapon_load: 0.0,
      weapon_cooldown: false,
      weapon_elapsed: 0.0
    };

    var cannon = [new Cannon(), new Cannon(), new Cannon(), new Cannon()];

    var ship_state = {up: false, down: false, right: false, left: false, shoot_up: false,
      x: 0, y: 0, radius: 10,
      think: function(ticks) {
        var velocity = ticks * 0.35;
        if (this.up) {
          ship.rotation.set(0,0,0);
          this.y += velocity;
        } else if (this.down) {
          this.y -= velocity;
          ship.rotation.set(0,0,0);
          ship.rotateZ(Math.PI);
        }

        if (this.left) {
          ship.rotation.set(0,0,0);
          ship.rotateZ(Math.PI/2);
          this.x -= velocity;
        } else if (this.right) {
          ship.rotation.set(0,0,0);
          ship.rotateZ(-Math.PI/2);
          this.x += velocity;
        }

        if (this.x < square.left) this.x = square.left;
        if (this.x > square.right) this.x = square.right;
        if (this.y > square.top) this.y = square.top;
        if (this.y < square.bottom) this.y = square.bottom;

        cannon.forEach(function(obj){
          obj.think(ticks);
        });

        if (this.shoot_up) cannon[0].spawnShoot(this.x, this.y, 0, 0.4);
        else if (this.shoot_down) cannon[1].spawnShoot(this.x, this.y, 0, -0.4);
        else if (this.shoot_right) cannon[2].spawnShoot(this.x, this.y, 0.4, 0);
        else if (this.shoot_left) cannon[3].spawnShoot(this.x, this.y, -0.4, 0);

        ship.position.x = this.x;
        ship.position.y = this.y;
      }
    };
    implementShipControls(document, ship_state);
    game_state.objects.push(ship_state);
  })();

  (function(){

    var elapsed = 0.0;
    var camera_state = {think: function(ticks) {
      // camera angle
      elapsed = elapsed + ticks*0.002;
      this.anglex = (ship.position.x + Math.cos(elapsed)*10) * Math.PI / 390;
      this.angley = -(ship.position.y + Math.sin(elapsed)*10) * Math.PI / 390;
      
      var updateCameraAngle = function() {
        var rotationMatrix = new THREE.Matrix4();
        var aux = new THREE.Matrix4();

        aux.makeRotationX(camera_state.angley);
        rotationMatrix = aux.multiply(rotationMatrix);

        aux = new THREE.Matrix4();
        aux.makeRotationY(camera_state.anglex);
        rotationMatrix = aux.multiply(rotationMatrix);

        camera.position.set(0,0,370);
        camera.position.applyMatrix4(rotationMatrix);
        camera.lookAt(origin);    
      };
      updateCameraAngle();

    }, anglex: 0, angley: 0};

    game_state.objects.push(camera_state);
  })();

  (function() {

    var think = function(ticks) {
      game_state.objects.forEach(function(obj){
        obj.think(ticks);
      });
    };

    var last_elapsed = null;
    var anim = function(elapsed) { 
      if (last_elapsed) {
        think(elapsed - last_elapsed);
      }
      last_elapsed = elapsed;
      renderer.render(scene,camera);
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  })();

};
