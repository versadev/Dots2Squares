  /* 
    Dots2Squares - Game

    Filename: dots2squares.js
    Version: 1.0
    Author: VersaDev Pty Ltd
    Support: support@versadev.com

    Summary:

    Originally a two player paper and pencil game presented as a computer game.
    A single player game against the computer.

    Rules:

    Each player takes it in turn to join two neighbouring dots either horizontally
    or vertically. A line is then drawn between the two dots.
    The player that completes the dots creating a square (2 x 2 dots), captures
    the square. The player with the most squares wins. If you or the computer captures a square, the player gets another turn.

    Development Notes:

    - Each dot only needs to keep track of if it is connected to the dot in the next column or row. This is the primary dot of a square.
    - A completed square can be determined by looking at the primary dots connections as well as the connections of the dot to the right and below.
    - No need to check a dot if it forms a square if the dot has an owner.
    - Dots in the last row and column will never have an owner. They cannot form the primary dot of a completed squre.

    Game AI

    Below is the order in which the computer plays its move.
    If a condition below cannot be met, move on to the next condition.
    - 1. Try and complete a square (three connections).
    - 2. Build an array of dots with no connections. Randomly select a dot.
    - 3. Build an array of dots with one connection. Randomly select a dot.
    - 4. Build an array of dots with two connections. Randomly select a dot.            
    - 5. No options, the game is over.

*/

    let DotGame = (function () {

        // Private global variables and functions
        let isDebug = false; // Show or hide debug window
        let isStats = false; // Show or hide stats window
        let isPlayer = true; // true: player has next move | false: computer has next move
        let isGameOver = true; // true: all squares completed. Set to true initially.

        let c = null; // Canvas object
        let ctx = null; // Canvas object context

        let canvasTop = 0; // Canvas top
        let canvasLeft = 0; // Canvas left
        let canvasWidth = 320; // Canvas width
        let canvasHeight = 240; // Canvas height
        let frameCount = 0; // Number of total rendered frames
        let framesElapsed = 0; // Number of frames elapsed. Used to calculate FPS
        let FPS = 0; // Number of frames per second. Read only and calculated based on GPU capability
        let currTime = null;
        let lastTime = null;
        let deltaTime = null;
        let deltaElapsed = null;
        let delayTimer1 = null; // Number of seconds to delay applied to delayTimer1
        let delayTimer2 = null; // Number of seconds to delay applied to delayTimer2
        let delayGradient = null; // Number of seconds to delay the applied gradient transition
        let AniFrame = null;

        let numRows = 7; // 7
        let numCols = 10; // 10

        let dots = []; // A collection of dots
        let numDots = numRows * numCols;
        let dotRadius = 8; // The radius of the dots in pixels
        let dotSpacing = 29; // The spacing of the dots in pixels
        
        let dotsSelected = 0; // 0 - no dots selected | 1 - 1 dot selected | 2 - 2 dots selected
        let firstDotIndexSelected = -1; // The array index of the first dot selected
        let secondDotIndexSelected = -1; // The array index of the second dot selected

        let playerScore = 0;
        let computerScore = 0;

        let audio1 = null;
        let audio2 = null;
        let audio3 = null;
        let audio4 = null;

        // Gradient - Ref: https://codepen.io/quasimondo/pen/AZedgK
        let colors = new Array(
        [62,35,255],
        [60,255,60],
        [255,35,98],
        [45,175,230],
        [255,0,255],
        [255,128,0]);

        let step = 0;

        // gradient color table indices for: 
        // current color left
        // next color left
        // current color right
        // next color right
        let colorIndices = [0,1,2,3];

        // gradient transition speed
        let gradientSpeed = 0.002;
        
        /* Class to hold a computer move */
        class ComputerMove {

            constructor(dotIndex, topLine, leftLine, bottomLine, rightLine) {
                this.dotIndex = dotIndex;
                this.topLine = topLine;      
                this.leftLine = leftLine;
                this.bottomLine = bottomLine;
                this.rightLine = rightLine;
            }
        };

        /* Class to providing properties and methods of a dot */
        class Dot {

            constructor(x, y, r, c, owner, selected) {
                this.x = x;
                this.y = y;      
                this.r = r;
                this.c = c;
                this.owner = owner;
                this.selected = selected;

                this.colConnected = 0;
                this.rowConnected = 0;
            }

            drawDot() {
                // Display the dot                                        
                let dotColour = '#1818FF'; // default display colour
                let dotSelectedColour = '#ffff00'; // selected colour


                if (this.selected == true) {
                    dotColour = dotSelectedColour;
                }

                // Draw the dot
                drawCircle(this.x, this.y, dotRadius, dotColour, false);
            }

            drawConnections() {
                // Display the connections for a dot
                let lineColour = '#ff0000'; // dot connected line colour
                let playerColour = '#00ff00'; // player initial colour
                let computerColour = '#ffffff'; // computer initial colour

                // Display horizontal connection
                if (this.colConnected > 0) {
                    drawLine(this.x, this.y, this.x + dotSpacing, this.y, lineColour, 4);
                }

                // Display vertical connection
                if (this.rowConnected > 0) {
                    drawLine(this.x, this.y, this.x, this.y + dotSpacing, lineColour, 4);
                }

                // Display owner
                if (this.owner == 1) {
                    ctx.font = "bold 12px Arial";
                    ctx.fillStyle = playerColour;
                    ctx.fillText("P", this.x + (dotSpacing / 2) - 3, this.y + (dotSpacing / 2) + 4);
                }

                if (this.owner == 2) {
                    ctx.font = "bold 12px Arial";
                    ctx.fillStyle = computerColour;
                    ctx.fillText("C", this.x + (dotSpacing / 2) - 3, this.y + (dotSpacing / 2) + 4);
                }                    
            }

            showMove(edgeType) {
                // Highlight the computer move
                let lineColour = '#00ff00'; // Colour of line connecting two dots showing computer move

                if (edgeType == 1) {
                    // Top horizontal line connection
                    drawLine(this.x, this.y, this.x + dotSpacing, this.y, lineColour, 4);
                }

                if (edgeType == 2) {
                    // Left verticle line connection
                    drawLine(this.x, this.y, this.x, this.y + dotSpacing, lineColour, 4);
                }
            }

        };

        let test = function () {
            alert('test');
        };

        let blockUITest = function () {

            // This is a test function to see if it is possible to block the UI.
            // I want to determine whether the animation via a call to the requestAnimationFrame() method
            // is blocked if a function call takes longer than the time at which the next frame is to be updated.

            let i = 0;
            let j = 0;
            DotGame.debugWindow("Delay started");
            for (i=0; i <= 100000000; i++) {
                j = i;
            }
            DotGame.debugWindow("Delay completed");
        };

        let setupGame = function () {
            // Main game setup

            let i = 0;
            let j = 0;
            let x = 0;
            let y = 0;
            let r = 0;
            let c = 0;
            let colour = '';
            let owner = 0;
            let selected = false;

            // Clear dots array
            dots.length = 0;

            // Generate the dots
            for (j=0; j<= numRows - 1; j++) {

                x = 0;
                y = y + dotSpacing;

                for (i=0; i<= numCols - 1; i++) {
                    
                    x = x + dotSpacing;
                    
                    r = j + 1;
                    c = i + 1;
                    owner = -1; // no owner

                    let newDot = new Dot(x,y,r,c,owner,selected);
                    dots.push(newDot);

                }
            }

            DotGame.debugWindow("Game board created");

        };

        let updateDisplay = function () {

            // Update the game display

            // Draw the dots
            let i = 0;                
            for (i = 0; i < dots.length; i++) {
                dots[i].drawDot();                    
            }

            // Draw the connections
            for (i = 0; i < dots.length; i++) {
                dots[i].drawConnections();                    
            }

            // Display active user
            if (isGameOver == false) {
                if (isPlayer == true) {
                    document.getElementById('isPlayer').innerHTML = 'Player Move';
                } else {
                    document.getElementById('isPlayer').innerHTML = 'Computer Move';
                }
            } else {
                //let marquee = document.createElement('MARQUEE');
                //marquee.innerHTML = "This is a quick test";                    
                //document.getElementById('isPlayer').appendChild(marquee);
                document.getElementById('isPlayer').innerHTML = '&nbsp;';
            }

            // Display game state
            document.getElementById('isGameOver').innerHTML = isGameOver;

            // Display scores
            document.getElementById('playerScore').innerHTML = playerScore.toString();
            document.getElementById('computerScore').innerHTML = computerScore.toString();

        };

        let startGame = function () {

            // Start or reset the game
            setupGame();

            // Reset scores
            playerScore = 0;
            computerScore = 0;
            isGameOver = false;
            isPlayer = true; // player goes first                

            // Hide game over message
            document.getElementById('gameOverMessage').style.visibility = 'hidden';
            document.getElementById('gameOverMessage').style.display = 'none';

            // Hide play button
            document.getElementById('btnPlay').style.visibility = 'hidden';
            document.getElementById('btnPlay').style.display = 'none';

            // Play background music
            playAudio(1);

        };

        let stopGame = function () {

        };

        let gameLoop = function () {
            
            // Main game loop

            // Game processing here...

            if (delayTimer2 <= 0.0) {

                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Update display
                updateDisplay();

            }
            
            if (delayGradient <= 0.0) {
                    delayGradient = .01
                    updateGradient();
            }

            // Update animation stats
            updateAnimationStats();
            
            // Check game over
            if (isGameOver == false) {
                checkGameOver();
            }
            
            // Check for computer move
            if (isPlayer == false && isGameOver == false) {
                computerMove();
            }

            // Keep Looping
            AniFrame(gameLoop);
        };

        let playAudio = function (audioId) {

            if (audioId == 1) {
                audio1.play(); // Game music
            }

            if (audioId == 2) {
                audio2.play(); // Player dot click
            }
            
            if (audioId == 3) {
                audio3.play(); // Computer move
            }       
            
            if (audioId == 4) {
                audio4.play(); // Game over
            }                
            
        };

        let updateGradient = function () {

            if ($===undefined ) return;

            let c0_0 = colors[colorIndices[0]];
            let c0_1 = colors[colorIndices[1]];
            let c1_0 = colors[colorIndices[2]];
            let c1_1 = colors[colorIndices[3]];

            let istep = 1 - step;
            let r1 = Math.round(istep * c0_0[0] + step * c0_1[0]);
            let g1 = Math.round(istep * c0_0[1] + step * c0_1[1]);
            let b1 = Math.round(istep * c0_0[2] + step * c0_1[2]);
            let color1 = "rgb("+r1+","+g1+","+b1+")";

            let r2 = Math.round(istep * c1_0[0] + step * c1_1[0]);
            let g2 = Math.round(istep * c1_0[1] + step * c1_1[1]);
            let b2 = Math.round(istep * c1_0[2] + step * c1_1[2]);
            let color2 = "rgb("+r2+","+g2+","+b2+")";

            $('#gameBody').css({
            background: "-webkit-gradient(linear, left top, right top, from("+color1+"), to("+color2+"))"}).css({
                background: "-moz-linear-gradient(left, "+color1+" 0%, "+color2+" 100%)"});
            
            step += gradientSpeed;
            if (step >= 1) {
                step %= 1;
                colorIndices[0] = colorIndices[1];
                colorIndices[2] = colorIndices[3];
                
                //pick two new target color indices
                //do not pick the same as the current one
                colorIndices[1] = ( colorIndices[1] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
                colorIndices[3] = ( colorIndices[3] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;                    
            }
        };

        let canvas_pointerdown = function (event) {

            // Determine canvas coordinates
            let totalOffsetX = 0;
            let totalOffsetY = 0;
            let canvasX = 0;
            let canvasY = 0;
            let currentElement = this;

            // We can log the pointerdown event and see all of the properties.
            console.log(event);

            do {
                totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
            }
            while (currentElement = currentElement.offsetParent)

            canvasX = event.pageX - totalOffsetX;
            canvasY = event.pageY - totalOffsetY;

            DotGame.debugWindow(canvasX + ' - ' + canvasY);

            // Check player turn
            if (isPlayer == true && isGameOver == false) {

                // Determine the selected dot
                let dotDetected = false;
                let i = 0;
                
                while (i < numDots) {

                    if (Math.abs(canvasX - dots[i].x) <= dotRadius && Math.abs(canvasY - dots[i].y) <= dotRadius) {
                        DotGame.debugWindow('Selected Dot = ' + i.toString() + ' row: ' + dots[i].r + ' col: ' + dots[i].c);
                        dots[i].selected = true;    
                                                
                        if (firstDotIndexSelected == -1) {
                            // First dot selected
                            dotsSelected = 1;
                            firstDotIndexSelected = i;
                            playAudio(2);
                        } else {
                            if (firstDotIndexSelected == i) {
                                // Second dot cannot be the same as the first
                            } else {
                                // Second dot selected
                                dotsSelected = 2;
                                secondDotIndexSelected = i;
                                playAudio(2);
                            }                            
                        }

                        if (dotsSelected == 2) {
                            // Apply checks to selected dots                            
                            DotGame.debugWindow('Two selected...');

                            let isValidLine = false; // Assume selected dots are not valid

                            if (Math.abs(dots[firstDotIndexSelected].c - dots[secondDotIndexSelected].c) == 0) {
                                // Same column
                                if (Math.abs(dots[firstDotIndexSelected].r - dots[secondDotIndexSelected].r) == 1) {
                                    // Next row
                                    isValidLine = true;
                                }                                
                            } else {
                                if (Math.abs(dots[firstDotIndexSelected].r - dots[secondDotIndexSelected].r) == 0) {
                                    // Same row
                                    if (Math.abs(dots[firstDotIndexSelected].c - dots[secondDotIndexSelected].c) == 1) {
                                        // Next column
                                        isValidLine = true;
                                    }                                
                                }
                            }

                            if (isValidLine == true) {
                                DotGame.debugWindow('Valid line');

                                // Determine the primary of the two dots
                                // The dot more left or more top

                                let primaryIndex = null;
                                let colConnected = null;
                                let rowConnected = null;

                                if (dots[firstDotIndexSelected].r == dots[secondDotIndexSelected].r) {
                                    // Same row
                                    primaryIndex = firstDotIndexSelected; // set first dot as primary (default)
                                    colConnected = dots[secondDotIndexSelected].c;
                                    rowConnected = dots[firstDotIndexSelected].r;
                                    if (dots[secondDotIndexSelected].c < dots[firstDotIndexSelected].c) {
                                        primaryIndex = secondDotIndexSelected; // second dot is primary
                                        colConnected = dots[firstDotIndexSelected].c;
                                    }
                                    // Apply connection
                                    dots[primaryIndex].colConnected = colConnected;

                                } else {
                                    // Same column
                                    primaryIndex = firstDotIndexSelected; // set first dot as primary (default)
                                    colConnected = dots[firstDotIndexSelected].c;
                                    rowConnected = dots[secondDotIndexSelected].r;
                                    if (dots[secondDotIndexSelected].r < dots[firstDotIndexSelected].r) {
                                        primaryIndex = secondDotIndexSelected; // second dot is primary
                                        rowConnected = dots[firstDotIndexSelected].r;
                                    }
                                    // Apply connection
                                    dots[primaryIndex].rowConnected = rowConnected;
                                }

                                // Check for completed squares
                                if (checkForCompletedSquares() == true) {
                                    isPlayer = true; // player gets another go
                                } else {
                                    delayTimer1 = 1; // number of seconds to apply to computer delay - appears computer is thinking
                                    isPlayer = false; // computers turn                                        
                                }
                            
                            }
                            
                            // Clear
                            dotsSelected = 0;

                            dots[firstDotIndexSelected].selected = false;
                            dots[secondDotIndexSelected].selected = false;

                            firstDotIndexSelected = -1;
                            secondDotIndexSelected = -1;
                        }

                        i = numDots; // Exit loop
                    } else {
                        i = i + 1;
                    }
                    
                } 

            }

        };

        let computerMove = function () {

            // Computer move

            /*
                Game AI

                Below is the order in which the computer plays its move.
                If a condition below cannot be met, move on to the next condition.
                - 1. Try and complete a square (three connections).
                - 2. Build an array of dots with no connections. Randomly select a dot.
                - 3. Build an array of dots with one connection. Randomly select a dot.
                - 4. Build an array of dots with two connections. Randomly select a dot.            
                - 5. No options, the game is over.
            */

            let jj = 0;
            let ii = 0;
            let r = 0;
            let c = 0;
            let dotIndex = 0;
            
            let edgeCount = 0;
            let topLine = false;
            let leftLine = false;
            let bottomLine = false;
            let rightLine = false;

            let primaryMoves = []; // A collection of possible primary moves.
            let secondaryMoves = []; // A collection of possible secondary moves.
            let tertiaryMoves = []; // A collection of possible tertiary moves.
            let quaternaryMoves = []; // A collection of possible quaternary moves.

            let availableSquares = 0;

            if (delayTimer1 <= 0) {
                // Perform the computer move if the delayTimer1 <= 0

                // For all uncompleted squares determine free edges.
                for (jj=0; jj<= numRows - 1; jj++) {

                    for (ii=0; ii<= numCols - 1; ii++) {

                        r = jj + 1;
                        c = ii + 1;
                        
                        // Check primary dot for owner.
                        // No need to process a square if it has an owner (completed).
                        if (dots[dotIndex].owner == -1) {

                            edgeCount = 0;
                            topLine = false;
                            leftLine = false;
                            bottomLine = false;
                            rightLine = false;

                            // Each dot is a primary dot of its square.
                            if (dots[dotIndex].colConnected == 0) {
                                topLine = false;
                            } else {
                                topLine = true;
                                edgeCount ++;
                            }

                            if (dots[dotIndex].rowConnected == 0) {
                                leftLine = false;
                            } else {
                                leftLine = true;
                                edgeCount ++;
                            }

                            // Determine index of dot to the right of primary dot.
                            let rightIndex = -1;
                            if (dots[dotIndex].c + 1 <= numCols) {
                                rightIndex = dotIndex + 1;
                                if (dots[rightIndex].rowConnected == 0) {
                                    rightLine = false;
                                } else {
                                    rightLine = true;
                                    edgeCount ++;
                                }
                            }

                            // Determine index of dot down of primary dot.
                            let downIndex = -1;
                            if (dots[dotIndex].r + 1 <= numRows) {
                                downIndex = dotIndex + numCols;
                                if (dots[downIndex].colConnected == 0) {
                                    bottomLine = false;
                                } else {
                                    bottomLine = true;
                                    edgeCount ++;
                                }                                                                 
                            }

                            if (rightIndex > -1 && downIndex > -1) {

                                availableSquares ++;

                                // Build arrays of possible moves
                                let newComputerMove = new ComputerMove(dotIndex, topLine, leftLine, bottomLine, rightLine);

                                switch(edgeCount) {
                                    case 0:
                                        // No sides completed
                                        quaternaryMoves.push(newComputerMove);
                                        break;
                                    case 1:
                                        // One side completed
                                        tertiaryMoves.push(newComputerMove);
                                        break;
                                    case 2:
                                        // Two sides completed
                                        secondaryMoves.push(newComputerMove);
                                        break;
                                    case 3:
                                        // Three sides completed
                                        primaryMoves.push(newComputerMove);
                                        break;
                                }
                            }

                        }

                        // Process the next primary dot
                        dotIndex++;
                    }

                }

                // Perform computer move
                // Determine the dotIndex of the move.
                // Pick appropriate random move. A random number 0 to array length - 1.
                // The picking order should be:
                // Primary - one edge left to complete
                // Quaternary - four edges left to complete
                // Tertiary - three edges left to complete                
                // Secondary - two edges left to complete (last option otherwise next move player will complete)
                let numPossibleMoves = 0;
                let computerNextMove = new ComputerMove();
                let nextMoveType = null;
                let randomIndex = null;

                if (primaryMoves.length > 0) {
                    numPossibleMoves = primaryMoves.length;
                    randomIndex = DotGame.randomNumber(numPossibleMoves-1);
                    nextMoveType = "Primary";

                    computerNextMove.dotIndex = primaryMoves[randomIndex].dotIndex;
                    computerNextMove.topLine = primaryMoves[randomIndex].topLine;
                    computerNextMove.leftLine = primaryMoves[randomIndex].leftLine;
                    computerNextMove.bottomLine = primaryMoves[randomIndex].bottomLine;
                    computerNextMove.rightLine = primaryMoves[randomIndex].rightLine;

                } else if (quaternaryMoves.length > 0) {
                    numPossibleMoves = quaternaryMoves.length;
                    randomIndex = DotGame.randomNumber(numPossibleMoves-1);
                    nextMoveType = "Quarternary";

                    computerNextMove.dotIndex = quaternaryMoves[randomIndex].dotIndex;
                    computerNextMove.topLine = quaternaryMoves[randomIndex].topLine;
                    computerNextMove.leftLine = quaternaryMoves[randomIndex].leftLine;
                    computerNextMove.bottomLine = quaternaryMoves[randomIndex].bottomLine;
                    computerNextMove.rightLine = quaternaryMoves[randomIndex].rightLine;                    

                } else if (tertiaryMoves.length > 0) {
                    numPossibleMoves = tertiaryMoves.length;
                    randomIndex = DotGame.randomNumber(numPossibleMoves-1);
                    nextMoveType = "Tertiary";

                    computerNextMove.dotIndex = tertiaryMoves[randomIndex].dotIndex;
                    computerNextMove.topLine = tertiaryMoves[randomIndex].topLine;
                    computerNextMove.leftLine = tertiaryMoves[randomIndex].leftLine;
                    computerNextMove.bottomLine = tertiaryMoves[randomIndex].bottomLine;
                    computerNextMove.rightLine = tertiaryMoves[randomIndex].rightLine;

                } else if (secondaryMoves.length > 0) {
                    numPossibleMoves = secondaryMoves.length;
                    randomIndex = DotGame.randomNumber(numPossibleMoves-1);
                    nextMoveType = "Secondary";

                    computerNextMove.dotIndex = secondaryMoves[randomIndex].dotIndex;
                    computerNextMove.topLine = secondaryMoves[randomIndex].topLine;
                    computerNextMove.leftLine = secondaryMoves[randomIndex].leftLine;
                    computerNextMove.bottomLine = secondaryMoves[randomIndex].bottomLine;
                    computerNextMove.rightLine = secondaryMoves[randomIndex].rightLine;
                }

                // Determine the dotIndex for the computer move.
                dotIndex = computerNextMove.dotIndex;

                console.log('Next Move Type: ' + nextMoveType);
                console.log(numPossibleMoves);
                console.log(dotIndex);
                console.log(computerNextMove);

                let moveIndex = null;
                let edgeType = null;

                // Perform the move
                if (computerNextMove.topLine == false) {
                    // Connect top line
                    if (dots[dotIndex].c + 1 <= numCols) {
                        dots[dotIndex].colConnected = dots[dotIndex].c + 1
                        moveIndex = dotIndex;
                        edgeType = 1;
                    }                        
                } else if (computerNextMove.leftLine == false) {
                    // Connect left line  
                    if (dots[dotIndex].r + 1 <= numRows) {
                        dots[dotIndex].rowConnected = dots[dotIndex].r + 1;
                        moveIndex = dotIndex;
                        edgeType = 2;
                    }                  
                } else if (computerNextMove.bottomLine == false) {
                    // Determine the dot below
                    let newIndex = null;
                    if (dots[dotIndex].r + 1 <= numRows) {
                        newIndex = dotIndex + numCols;
                        dots[newIndex].colConnected = dots[newIndex + 1].c;
                        moveIndex = newIndex;
                        edgeType = 1;
                    }                    
                } else if (computerNextMove.rightLine == false) {
                    // Determine the dot to the right
                    let newIndex = null;
                    if (dots[dotIndex].c + 1 <= numCols) {
                        newIndex = dotIndex + 1;
                        dots[newIndex].rowConnected = dots[newIndex + 1].r;
                        moveIndex = newIndex;
                        edgeType = 2;
                    }
                }

                // Highlight the computer move
                console.log('moveIndex = ' + moveIndex.toString());
                console.log('edgeType = ' + edgeType.toString());
                dots[moveIndex].showMove(edgeType);
                playAudio(3);

                // Check for completed squares
                if (checkForCompletedSquares() == true) {
                    isPlayer = false; // Computer goes again
                } else {
                    isPlayer = true; // Players turn
                }

                // Update available squares
                document.getElementById('availableSquares').innerHTML = availableSquares.toString();

                // Update stats for possible moves
                document.getElementById('primaryMoves').innerHTML = primaryMoves.length.toString();
                document.getElementById('secondaryMoves').innerHTML = secondaryMoves.length.toString();
                document.getElementById('tertiaryMoves').innerHTML = tertiaryMoves.length.toString();
                document.getElementById('quaternaryMoves').innerHTML = quaternaryMoves.length.toString();

                delayTimer2 = 1; // introduce a delay to highlight computer move

            }

        };

        let checkForCompletedSquares = function () {

            // Check for completed squares
            // If the square is completed, set the appropriate owner.
            let jj = 0;
            let ii = 0;
            let r = 0;
            let c = 0;
            let dotIndex = 0;
            let isCompleted = false; // if one or more square are completed, return true

            for (jj=0; jj<= numRows - 1; jj++) {

                for (ii=0; ii<= numCols - 1; ii++) {

                    r = jj + 1;
                    c = ii + 1;

                    // Check primary dot for owner.
                    if (dots[dotIndex].owner == -1) {
                        // No owner, check for completed square and set appropriate owner.
                        // Each dot is a primary dot of its square.
                        if (dots[dotIndex].rowConnected != 0 && dots[dotIndex].colConnected != 0) {
                            // The dot is connected to the right and down

                            // Determine index of dot to the right of primary dot.
                            let rightIndex = -1;
                            if (dots[dotIndex].c + 1 <= numCols) {
                                rightIndex = dotIndex + 1;
                                if (dots[rightIndex].rowConnected != 0) {
                                    // This dot is vertically connected
                                    // Determine index of dot down of primary dot.
                                    let downIndex = -1;
                                    if (dots[dotIndex].r + 1 <= numRows) {
                                        downIndex = dotIndex + numCols;
                                        if (dots[downIndex].colConnected != 0) {
                                            // This dot is horizontally connected
                                            // We have a completed square
                                            // Set appropriate owner
                                            if (isPlayer == true) {
                                                dots[dotIndex].owner = 1;                                                    
                                            } else {
                                                dots[dotIndex].owner = 2;                                                    
                                            }                            
                                            // Update score
                                            updateScore();    
                                            // One ore more squares completed
                                            isCompleted = true;                
                                        }
                                    }
                                }
                            }
                            
                        }
                    }

                    dotIndex++;
                    
                }
            }

            return isCompleted;

        };

        let updateScore = function () {
            // Update games scores
            if (isPlayer == true) {
                playerScore++;
            } else {
                computerScore++;
            }
        };

        let checkGameOver = function () {
            // Check for game over
            // Have all squares been completed
            let numSquares = 0;
            numSquares = (numCols - 1) * (numRows - 1);

            if (playerScore + computerScore == numSquares) {
                isGameOver = true;

                // Show game over message
                document.getElementById('gameOverMessage').style.visibility = 'visible';
                document.getElementById('gameOverMessage').style.display = '';

                // Show play button
                document.getElementById('btnPlay').style.visibility = 'visible';
                document.getElementById('btnPlay').style.display = '';

                // Stop game music
                audio1.pause();

                // Play game over sound
                playAudio(4);

            }
        };

        let updateAnimationStats = function () {
            
            frameCount++; // Increment the total frame count

            if (isStats == true) {
                $('#frameCount').text(frameCount);
            }

            // Calculate FPS
            currTime = new Date().getTime(); // Get current time
            deltaTime = (currTime - lastTime) / 1000.0; // Determine time (seconds) between last frame
            deltaElapsed = deltaElapsed + deltaTime;
            delayTimer1 = delayTimer1 - deltaTime;
            delayTimer2 = delayTimer2 - deltaTime;
            delayGradient = delayGradient - deltaTime;
            lastTime = currTime // Update last time
            framesElapsed++; // Increment the elapsed frames used to determine FPS

            // Check if elapsed time is greater than or equal to 1 second
            if (deltaElapsed >= 1.0) {
                // Calculate FPS
                let FPS = 0;
                FPS = parseInt(framesElapsed / deltaElapsed).toString();

                // Reset counters
                deltaElapsed = 0;
                framesElapsed = 0;
                if (isStats == true) {
                    $('#fps').text(FPS); // Display FPS
                    $('#delayTimer1').text(delayTimer1); // Display delayTimer1
                    $('#delayTimer2').text(delayTimer2.toString()); // Display delayTimer2
                }
            }

            // Reset delay timer 1 if <= 0.0 to 0
            if (delayTimer1 <= 0.0) {
                delayTimer1 = 0;
            }

            // Reset delay timer 2 if <= 0.0 to 0
            if (delayTimer2 <= 0.0) {
                delayTimer2 = 0;
            }
            
        };

        let reqAniFrame = function () {

            // Finds the first API that works to optimize the animation / game loop, otherwise defaults to setTimeout().                
            return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
        };

        let drawCircle = function (x1, y1, radius, color, fill) {
            // Function - Draw A Circle
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(x1, y1, radius, (Math.PI/180)*0, (Math.PI/180)*360, false);
            ctx.fillStyle = color;
            if (fill == true) {
                ctx.fill();
            }
            ctx.stroke();
            ctx.closePath();
        };

        let drawLine = function (x1, y1, x2, y2, colour, lineWidth) {
            // Function - Draw A Line
            ctx.strokeStyle = colour;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'bevel';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();            
        };

        let drawBox = function (x1, y1, width, height, colour, lineWidth, fill) {
            // Function - Draw A Box

            if (fill == false) {
                ctx.strokeStyle = colour;
                ctx.lineWidth = lineWidth;
                ctx.strokeRect(x1, y1, width, height);
                
            }  else {
                ctx.strokeStyle = colour;
                ctx.lineWidth = lineWidth;
                ctx.fillStyle = colour;
                ctx.fillRect(x1, y1, width, height);                                      
            }
                        
        };

        // Privileged / Public Methods And Properties
        return {

            appVersion: 1.0,

            init: function () {

                // Check for Debug mode
                if (isDebug == true) {
                    $('#debugWindow').css('display', 'block');
                } else {
                    $('#debugWindow').css('display', 'none');
                }

                // Check for Stats mode
                if (isStats == true) {                        
                    $('#statsWindow').css('display', 'block');
                } else {                        
                    $('#statsWindow').css('display', 'none');
                }

                // Set Canvas position and dimensions
                $('#mainCanvas').css('top', canvasTop);
                $('#mainCanvas').css('left', canvasLeft);
                //$('#mainCanvas').width(canvasWidth);
                //$('#mainCanvas').height(canvasHeight);
                $('#mainCanvas').css('width', canvasWidth);
                $('#mainCanvas').css('height', canvasHeight);

                document.getElementById('mainCanvas').setAttribute('width', canvasWidth);
                document.getElementById('mainCanvas').setAttribute('height', canvasHeight);

                // Get the canvas element using DOM
                c = document.getElementById('mainCanvas');

                // Add event listener                    
                //c.addEventListener('click', canvas_onclick, false);
                c.addEventListener('pointerdown', canvas_pointerdown, false);

                // Make sure we don't execute when canvas is not supported
                if (c.getContext) {
                    // Use getContext to use the canvas for drawing
                    ctx = c.getContext("2d");
                } else {
                    window.alert('Your browser does not support HTML5.');
                }

                // Initialise time variables - used to track current and elapsed time to determine FPS
                currTime = new Date().getTime();
                lastTime = currTime;
                deltaTime = 0;
                delayTimer1 = 0;
                delayTimer2 = 0;
                delayGradient = 0;

                // Setup audio
                audio1 = new Audio('media/gamemusic.mp3');
                if (typeof audio1.loop == 'boolean') {
                    audio1.loop = true;
                } else {
                    audio1.addEventListener('ended', function() {
                        this.currentTime = 0;
                        this.play();
                    }, false);
                }

                audio2 = new Audio('media/pop1.mp3');
                audio3 = new Audio('media/pop2.mp3');
                audio4 = new Audio('media/gameover.mp3');

                // Setup the game
                setupGame();

                // Display gradient
                //setInterval(updateGradient,10);
                updateGradient();

                // Setup the game loop
                AniFrame = reqAniFrame();                   
                AniFrame(gameLoop); // Start the loop

                this.debugWindow('Running');

            },

            play: function () {
                startGame();
            },

            // Tools and Utilities
            debugWindow: function (debugMsg) {
                if (isDebug == true) {
                    let win = document.getElementById('debugWindow');
                    win.innerHTML = debugMsg + '</br>' + win.innerHTML;
                }
                return false;
            },

            debugWindowClear: function () {
                if (isDebug == true) {
                    let win = document.getElementById('debugWindow');
                    win.innerHTML = '';
                }
                return false;
            },

            randomNumber: function (maxValue) {
                // Generate a random number from 0 to maxValue
                let min = 0;
                let max = maxValue;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            randomNumberFromRange: function (minValue, maxValue) {
                // Generate a random number from minValue to maxValue
                let min = minValue;
                let max = maxValue;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            getRandomColor: function() {
                let letters = new Array();
                letters = '0123456789ABCDEF'.split('');
                let color = '#';
                for (let i = 0; i < 6; i++ ) {
                    color += letters[Math.round(Math.random() * 15)];
                }
                return color;
            },    

            decimalToHex: function (d, padding) {
                let hex = Number(d).toString(16);
                padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

                while(hex.length < padding) {
                    hex = "0" + hex;
                }

                return hex;
            },

            rowColumnToIndex: function(r, c, numColumns) {
                // Convert row x col position to collection index
                let posNum = 0;
                posNum = (((r - 1) * numColumns) + c) - 1; // rows and columns start at 1, arrays start at 0
                return posNum;
            },

            indexToRowColumn: function() {
                // Convert a collection index to a row x col position
                let rownum = null;
                let colnum = null;


                //**** TO DO ****

                let location = {
                    row: rownum,
                    col: colnum,
                };

                return location;
            }

        };

    }) ();

    // Run the game
    DotGame.init();