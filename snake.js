var $;
Array.prototype.remove = function (index) {
    this.splice(index, 1);
};


// i guess this is like an enum or something
var dir = {
    NORTH: 0,
    EAST: 1,
    WEST: 2,
    SOUTH: 3,
    is_opposite: function (a, b) {
        var o = false;
        switch (a) {
        case dir.NORTH:
            o = (b === dir.SOUTH);
            break;

        case dir.WEST:
            o = (b === dir.EAST);
            break;

        case dir.EAST:
            o = (b === dir.WEST);
            break;

        case dir.SOUTH:
            o = (b === dir.NORTH);
            break;
        }

        return o;
    }
};

function Point(x, y) {
    this.x = x;
    this.y = y;

    return this;
}

function Food(x, y, color) {
    var that = new Point(x, y);
    that.length = 1;
    that.members = [that];
    that.color = color;

    that.draw = function (canvas) {
        canvas.drawRect({
            fillStyle: "#" + this.color,
            x: this.x * canvas.zoom,
            y: this.y * canvas.zoom,
            width: canvas.zoom,
            height: canvas.zoom,
            shadowColor: "#" + this.color,
            shadowBlur: 6,
            fromCenter: false
        });
    };

    return that;
}


function SnakeSegment(x, y, color) {
    var that = new Point(x, y);
    that.color = color;

    that.draw = function (canvas) {
        canvas.drawRect({
            fillStyle: "#" + this.color,
            x: this.x * canvas.zoom,
            y: this.y * canvas.zoom,
            width: canvas.zoom,
            height: canvas.zoom,
            shadowColor: "#" + this.color,
            shadowBlur: 16,
            fromCenter: false
        });
    };

    return that;
}

function Snake(x, y, d, len, color) {
    this.dir = d;
    this.dead = false;
    this.score = 0;
    this.color = color;
    this.length = len;
    this.members = [];
    // made to avoid snake changing dir twice in same frame
    this.changed_dir = false;

    var i;
    for (i = 0; i < this.length; i += 1) {
        this.members[i] = new SnakeSegment(x, y + i, this.color);
    }

    this.set_dir = function (newdir) {
        if (!this.changed_dir && !dir.is_opposite(this.dir, newdir)) {
            this.dir = newdir;
            this.changed_dir = true;
        }
    };

    this.head_collision = function (snake2) {
        if (this.dead || snake2.dead || this === snake2) {
            return false;
        }

        return (this.members[0].x === snake2.members[0].x &&
            this.members[0].y === snake2.members[0].y);
    };

    this.collides = function (element) {
        var collides, start, i, p;

        if (this.dead) {
            return false;
        }

        collides = false;

        // ignore first element if checking itself
        start = (element === this) ? 1 : 0;

        for (i = start; i < element.length && !collides; i += 1) {
            p = element.members[i];

            if (this.members[0].x === p.x &&
                    this.members[0].y === p.y) {

                collides = true;
            }
        }

        return collides;
    };

    this.out_of_bounds = function (width, height) {
        var p, i, out = false;

        if (this.dead) {
            return false;
        }

        for (i = 0; i < this.members.length && !out; i += 1) {
            p = this.members[i];

            if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) {
                out = true;
            }
        }

        return out;
    };

    this.kill = function () {
        this.dead = true;
        this.members = [];
        this.length = 0;
    };

    this.get_next_p = function (xx, yy) {

        var mod = 1;

        switch (this.dir) {
        case dir.NORTH:
            yy -= mod;
            break;

        case dir.EAST:
            xx += mod;
            break;

        case dir.WEST:
            xx -= mod;
            break;

        case dir.SOUTH:
            yy += mod;
            break;
        }

        return {x: xx, y: yy};
    };

    this.move = function () {
        var p;

        if (this.dead) {
            return;
        }

        p = this.get_next_p(this.members[0].x, this.members[0].y);

        this.members.pop();
        this.members.unshift(new SnakeSegment(p.x, p.y, this.color));

        // can change dir again
        this.changed_dir = false;
    };

    this.grow = function () {
        var p;

        p = this.members[0];
        this.members.unshift(new SnakeSegment(p.x, p.y, this.color));
        this.length += 1;
        this.score += 1;
    };

    this.draw = function (canvas) {
        var i;

        for (i = 0; i < this.members.length; i += 1) {
            this.members[i].draw(canvas);
        }
    };

    return this;
}

var game = {
    canvasElement: "#game",
    canvas: null,
    width: 160,             //default
    height: 120,            //default
    MAX_FOOD: 8,
    INIT_SIZE: 16,          //starting size for snakes
    color1: "338",          //player 1
    color2: "833",          //player 2
    color3: "2a2",          //food
    clock: 0,
    speed: 0,               // initial speed
    food: null,             // array of food pellets
    timer: null,
    stopped: true,
    snakes: {
        members: [],
        move: function () {
            var i;
            for (i = 0; i < this.members.length; i += 1) {
                this.members[i].move();
            }
        },
        collide_snake: function () {
            var i, j, snake1, snake2;
            for (i = 0; i < this.members.length; i += 1) {
                snake1 = this.members[i];

                for (j = 0; j < this.members.length; j += 1) {
                    snake2 = this.members[j];

                    if (snake1.head_collision(snake2)) {
                        snake1.kill();
                        snake2.kill();
                    } else if (snake1.collides(snake2) ||
                            snake1.collides(snake1) ||
                            snake1.out_of_bounds(game.width, game.height)) {

                        snake1.kill();
                    }
                }
            }
        },
        collide_food: function (food) {
            var i, j, snake;

            for (i = 0; i < this.members.length; i += 1) {
                snake = this.members[i];

                for (j = 0; j < food.length; j += 1) {

                    if (snake.collides(food[j])) {
                        snake.grow();
                        food.remove(j);
                    }
                }
            }
        },
        all_dead: function () {
            var dead_count = 0, i;

            for (i = 0; i < this.members.length; i += 1) {
                dead_count += this.members[i].dead ? 1 : 0;
            }

            return (dead_count === this.members.length);
        },
        draw: function (canvas) {
            var i;
            for (i = 0; i < this.members.length; i += 1) {
                this.members[i].draw(canvas);
            }
        }
    },

    input: function (keyCode) {

        if (!game.stopped) {

            switch (keyCode) {
            case 87: //w
                game.snakes.members[0].set_dir(dir.NORTH);
                break;
            case 65: //a
                game.snakes.members[0].set_dir(dir.WEST);
                break;
            case 83: //s
                game.snakes.members[0].set_dir(dir.SOUTH);
                break;
            case 68: //d
                game.snakes.members[0].set_dir(dir.EAST);
                break;
            case 38: //up
                game.snakes.members[1].set_dir(dir.NORTH);
                break;
            case 37: //left
                game.snakes.members[1].set_dir(dir.WEST);
                break;
            case 40: //down
                game.snakes.members[1].set_dir(dir.SOUTH);
                break;
            case 39: //right
                game.snakes.members[1].set_dir(dir.EAST);
                break;
            }
        }

        if (keyCode === 82) { // r
            game.restart();
        }
    },

    init: function (width, height, zoom) {
        if (game.canvas === null) {

            // adjusting so they're multiples of the ZOOM factor
            width = Math.floor(width / zoom) * zoom;
            height = Math.floor(height / zoom) * zoom;

            game.width = Math.floor(width / zoom);
            game.height = Math.floor(height / zoom);

            game.canvas = $(game.canvasElement);
            game.canvas[0].width = width;
            game.canvas[0].height = height;
            game.canvas.zoom = zoom;

            game.canvas.click(function () {
                if(game.stopped) {
                    game.restart();
                }
            });
        }

        game.clock = 0;
        game.lastinput = 0;
        game.speed = 80;
        game.init_snakes();

        game.food = [];
        game.food.push(new Food(Math.floor(game.width / 2),
            Math.floor(game.height / 2), game.color3));
    },

    init_snakes: function () {

        game.snakes.members = [];
        game.snakes.members.push(new Snake(4, Math.floor(game.height / 2),
            dir.EAST, game.INIT_SIZE, game.color1));

        game.snakes.members.push(new Snake(game.width - 4,
            Math.floor(game.height / 2), dir.WEST, game.INIT_SIZE, game.color2));
    },

    start: function () {
        game.timer = setTimeout(game.step, game.speed);
        game.stopped = false;
    },

    stop: function () {
        clearTimeout(game.timer);
        game.stopped = true;
    },

    draw: function () {
        var i;

        game.canvas.clearCanvas();
        game.canvas.drawRect({
            strokeStyle: "#aaa",
            strokewidth: 1,
            x: 0,
            y: 1,
            width: game.width * game.canvas.zoom,
            height: (game.width * game.canvas.zoom) - 1,
            fromCenter: false
        });

        if (!game.stopped) {
            for (i = 0; i < game.food.length; i += 1) {
                game.food[i].draw(game.canvas);
            }

            game.snakes.draw(game.canvas);

            game.draw_score();
        } else {
            game.canvas.drawText({
                fillStyle: "#aaa",
                strokeStyle: "#000",
                strokewidth: 1,
                x: game.width * game.canvas.zoom / 2,
                y: (game.height * game.canvas.zoom / 2) - 40,
                text: "GAME OVER!",
                align: "center",
                baseline: "middle",
                font: "bold 24pt monospace"
            }).drawText({
                fillStyle: "#aaa",
                strokeStyle: "#000",
                strokewidth: 1,
                x: game.width * game.canvas.zoom / 2,
                y: game.height * game.canvas.zoom / 2,
                text: "YOUR SCORE: " + game.snakes.members[0].score +
                    " + " + game.snakes.members[1].score + " = " +
                    (game.snakes.members[0].score + game.snakes.members[1].score),
                align: "center",
                baseline: "middle",
                font: "bold 24pt monospace"
            }).drawText({
                fillStyle: "#aaa",
                strokeStyle: "#000",
                strokewidth: 1,
                x: game.width * game.canvas.zoom / 2,
                y: (game.height * game.canvas.zoom / 2) + 40,
                text: "PRESS 'R' TO RESTART",
                align: "center",
                baseline: "middle",
                font: "bold 24pt monospace"
            });
        }
    },

    step: function () {

        if (game.stopped) {
            return;
        }

        game.clock += 1;

        // speed up game
        if ((game.clock % 15) === 0 && game.speed > 20) {
            game.speed -= 1;
        }

        if (game.food.length < game.MAX_FOOD && (Math.random() * 10) > 9.9) {
            game.food.push(new Food(
                2 + Math.floor((Math.random() * game.width) - 2),
                2 + Math.floor((Math.random() * game.height) - 2),
                game.color3
            ));
        }

        game.snakes.collide_snake();
        game.snakes.collide_food(game.food);
        game.snakes.move();

        if (game.snakes.all_dead()) {
            game.stop();
        }

        game.timer = setTimeout(game.step, game.speed);
        game.draw();
    },

    restart: function () {
        game.stop();
        game.init();
        game.start();
    },

    draw_score: function () {
        game.canvas.drawText({
            fillStyle: "#aaa",
            strokeStyle: "#000",
            strokewidth: 1,
            x: 2,
            y: game.height * game.canvas.zoom,
            text: game.snakes.members[0].score,
            align: "left",
            baseline: "bottom",
            font: "bold 16pt monospace"
        });

        game.canvas.drawText({
            fillStyle: "#aaa",
            strokeStyle: "#000",
            strokewidth: 1,
            x: (game.width * game.canvas.zoom) - 2,
            y: game.height * game.canvas.zoom,
            text: game.snakes.members[1].score,
            align: "right",
            baseline: "bottom",
            font: "bold 16pt monospace"
        });
    }
};
