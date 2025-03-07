import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const COLS = 48;
const ROWS = 48;
const DEFAULT_LENGTH = 10;

enum Direction {
  UP,
  DOWN,
  RIGHT,
  LEFT
}

interface Coordinate {
  row: number;
  col: number;
  isHead?: boolean;
}

// Audio elements
const gameAudio = new Audio("/gameplay.mp3");
gameAudio.loop = true;

const bonusAudio = new Audio("/point.mp3");
const errorAudio = new Audio("/error.mp3");

function App() {
  const timer = useRef<number | null>(null);
  const grid = useRef<string[][]>(Array(ROWS).fill(Array(COLS).fill("")));
  const snakeCoordinates = useRef<Coordinate[]>([]);
  const direction = useRef<Direction>(Direction.RIGHT);
  const snakeCoordinatesMap = useRef<Set<string>>(new Set());
  const foodCoords = useRef<Coordinate>({
    row: -1,
    col: -1
  });
  
  const [points, setPoints] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPlaying, setPlaying] = useState<number>(0);

  useEffect(() => {
    window.addEventListener("keydown", (e) => handleDirectionChange(e.key));
    
    return () => {
      window.removeEventListener("keydown", (e) => handleDirectionChange(e.key));
    };
  }, []);

  useEffect(() => {
    // Default snake length is 10 cells
    const snakePositions: Coordinate[] = [];
    for (let i = 0; i < DEFAULT_LENGTH; i++) {
      snakePositions.push({
        row: 0,
        col: i,
        isHead: false
      });
    }

    snakePositions[DEFAULT_LENGTH - 1].isHead = true;
    snakeCoordinates.current = snakePositions;

    syncSnakeCoordinatesMap();
    populateFoodBall();
  }, []);

  const handleDirectionChange = (key: string) => {
    const newDirection = getNewDirection(key);
    
    // Prevent 180-degree turns
    if (
      (direction.current === Direction.UP && newDirection === Direction.DOWN) ||
      (direction.current === Direction.DOWN && newDirection === Direction.UP) ||
      (direction.current === Direction.LEFT && newDirection === Direction.RIGHT) ||
      (direction.current === Direction.RIGHT && newDirection === Direction.LEFT)
    ) {
      return;
    }
    
    direction.current = newDirection;
  };

  const getNewDirection = (key: string): Direction => {
    switch (key) {
      case "ArrowUp":
        return Direction.UP;
      case "ArrowDown":
        return Direction.DOWN;
      case "ArrowRight":
        return Direction.RIGHT;
      case "ArrowLeft":
        return Direction.LEFT;
      default:
        return direction.current;
    }
  };

  const syncSnakeCoordinatesMap = () => {
    const snakeCoordsSet = new Set(
      snakeCoordinates.current.map((coord) => `${coord.row}:${coord.col}`)
    );
    snakeCoordinatesMap.current = snakeCoordsSet;
  };

  const moveSnake = () => {
    if (gameOver) return;

    setPlaying((s) => s + 1);

    const coords = snakeCoordinates.current;
    const snakeTail = coords[0];
    const snakeHead = coords.pop();
    
    if (!snakeHead) return; // Type safety check
    
    const currentDirection = direction.current;

    // Check for food ball consumption
    const foodConsumed =
      snakeHead.row === foodCoords.current.row &&
      snakeHead.col === foodCoords.current.col;

    // Update body coords based on direction and its position
    coords.forEach((_, idx) => {
      // Replace last cell with snake head coords [last is the cell after snake head]
      if (idx === coords.length - 1) {
        coords[idx] = { ...snakeHead };
        coords[idx].isHead = false;
        return;
      }

      // Replace current cell coords with next cell coords
      coords[idx] = coords[idx + 1];
    });

    // Update snake head coords based on direction
    switch (currentDirection) {
      case Direction.UP:
        snakeHead.row -= 1;
        break;
      case Direction.DOWN:
        snakeHead.row += 1;
        break;
      case Direction.RIGHT:
        snakeHead.col += 1;
        break;
      case Direction.LEFT:
        snakeHead.col -= 1;
        break;
    }

    // If food ball is consumed, update points and new position of food
    if (foodConsumed) {
      setPoints((points) => points + 10);
      populateFoodBall();
      bonusAudio.play();
    }

    // If there is a collision for the movement, end the game
    const collided = collisionCheck(snakeHead);
    if (collided) {
      stopGame();
      return;
    }

    // Create new coords with new snake head
    coords.push(snakeHead);
    snakeCoordinates.current = foodConsumed
      ? [snakeTail, ...coords]
      : coords;
    syncSnakeCoordinatesMap();
  };

  const collisionCheck = (snakeHead: Coordinate): boolean => {
    // Check wall collision
    if (
      snakeHead.col >= COLS ||
      snakeHead.row >= ROWS ||
      snakeHead.col < 0 ||
      snakeHead.row < 0
    ) {
      return true;
    }

    // Check body collision
    const coordsKey = `${snakeHead.row}:${snakeHead.col}`;
    if (snakeCoordinatesMap.current.has(coordsKey)) {
      return true;
    }
    
    return false;
  };

  const populateFoodBall = () => {
    // Generate random coordinates for the food
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);

    // Make sure food doesn't appear on the snake
    const coordsKey = `${row}:${col}`;
    if (snakeCoordinatesMap.current.has(coordsKey)) {
      // If the position is occupied by the snake, try again
      populateFoodBall();
      return;
    }

    foodCoords.current = {
      row,
      col
    };
  };

  const startGame = () => {
    // Reset the game state if it was previously over
    if (gameOver) {
      resetGame();
    }
    
    const interval = setInterval(() => {
      moveSnake();
    }, 100);

    timer.current = interval;
    gameAudio.play();
  };

  const stopGame = () => {
    gameAudio.pause();
    errorAudio.play();
    setGameOver(true);
    setPlaying(0);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  
  const resetGame = () => {
    // Reset snake
    const snakePositions: Coordinate[] = [];
    for (let i = 0; i < DEFAULT_LENGTH; i++) {
      snakePositions.push({
        row: 0,
        col: i,
        isHead: false
      });
    }
    snakePositions[DEFAULT_LENGTH - 1].isHead = true;
    snakeCoordinates.current = snakePositions;
    
    // Reset direction
    direction.current = Direction.RIGHT;
    
    // Reset game state
    setGameOver(false);
    setPoints(0);
    
    // Sync snake coordinates and place new food
    syncSnakeCoordinatesMap();
    populateFoodBall();
  };

  const getCell = useCallback(
    (rowIdx: number, colIdx: number) => {
      const coords = `${rowIdx}:${colIdx}`;
      const foodPos = `${foodCoords.current.row}:${foodCoords.current.col}`;
      const head =
        snakeCoordinates.current[snakeCoordinates.current.length - 1];
      const headPos = head ? `${head.row}:${head.col}` : "";

      const isFood = coords === foodPos;
      const isSnakeBody = snakeCoordinatesMap.current.has(coords);
      const isHead = headPos === coords;

      let className = "cell";
      if (isFood) {
        className += " food";
      }
      if (isSnakeBody) {
        className += " body";
      }
      if (isHead) {
        className += " head";
      }

      return <div key={colIdx} className={className}></div>;
    },
    [isPlaying]
  );

  return (
    <div className="app-container">
      {gameOver ? (
        <>
          <p className="game-over">GAME OVER</p>
          <button onClick={resetGame}>PLAY AGAIN</button>
        </>
      ) : (
        <button onClick={isPlaying ? stopGame : startGame}>
          {isPlaying ? "STOP" : "START"} GAME
        </button>
      )}
      <div className="board">
        {grid.current?.map((row, rowIdx) => (
          <div key={rowIdx} className="row">
            {row.map((_, colIdx) => getCell(rowIdx, colIdx))}
          </div>
        ))}
      </div>
      <p className="score">SCORE {points}</p>
      <div className="keys-container">
        <button onClick={() => handleDirectionChange("ArrowUp")}>
          UP
        </button>
        <div className="key-row">
          <button onClick={() => handleDirectionChange("ArrowLeft")}>
            LEFT
          </button>
          <button onClick={() => handleDirectionChange("ArrowRight")}>
            RIGHT
          </button>
        </div>
        <button onClick={() => handleDirectionChange("ArrowDown")}>
          DOWN
        </button>
      </div>
    </div>
  );
}

export default App;