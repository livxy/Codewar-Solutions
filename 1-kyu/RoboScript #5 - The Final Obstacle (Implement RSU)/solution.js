class RSUProgram {
    constructor(source) {
      // TODO: Configure and customize your class constructor
      this._source = source;
    }
    getTokens() {
      // TODO: Convert `source` (argument from class constructor) into
      // an array of tokens as specified in the Description if `source`
      // is a valid RSU program; otherwise, throw an error (ideally with
      // a suitable message)
      let source = this._source,
        result = [];
      for (let i = 0; i < source.length; i++) {
        var token;
        switch (source[i]) {
          case "F":
          case "L":
          case "R":
          case ")":
            token = source[i++];
            while (/\d/.test(source[i])) token += source[i++];
            i--;
            if (token.length > 2 && token[1] == "0")
              throw new SyntaxError("Invalid token detected");
            result.push(token);
            break;
          case "(":
          case "q":
            result.push(source[i]);
            break;
          case "p":
          case "P":
            token = source[i++];
            while (/\d/.test(source[i])) token += source[i++];
            i--;
            if (token.length < 2 || (token.length > 2 && token[1] == "0"))
              throw new SyntaxError("Invalid token detected");
            result.push(token);
            break;
          case "/":
            if (source[i + 1] === "/") {
              while (source[i] != "\n" && i < source.length) i++;
            } else if (source[i + 1] === "*") {
              i++;
              while (
                (source[i + 1] != "*" || source[i + 2] != "/") &&
                i < source.length - 2
              )
                i++;
              if (source[i + 1] != "*" || source[i + 2] != "/")
                throw new SyntaxError("Invalid token detected");
              i += 2;
            } else throw new SyntaxError("Invalid token detected");
            break;
          default:
            if (/[^\s\r\t\n]/.test(source[i]))
              throw new SyntaxError("Invalid token encountered");
        }
      }
      return result;
    }
    convertToRaw(tokens) {
      // TODO: Process the array of tokens generated by the `getTokens`
      // method (passed into this method as `tokens`) and return an (new)
      // array containing only the raw commands `F`, `L` and/or `R`
      // Throw a suitable error if necessary
      var _convert = function (tokens, patterns) {
          patterns = JSON.parse(JSON.stringify(patterns));
          var stack = [],
            decls = new Set();
          for (var i = 0; i < tokens.length; i++) {
            switch (tokens[i][0]) {
              case "(":
                stack.push(tokens[i]);
                break;
              case ")":
                if (stack.length && stack[stack.length - 1][0] === "(")
                  stack.pop();
                else stack.push(tokens[i]);
                break;
              case "p":
                if (stack.length && stack[stack.length - 1][0] === "(")
                  throw new SyntaxError(
                    "Pattern definitions may not be nested within bracketed sequences!"
                  );
                if (!stack.length) {
                  if (decls.has(tokens[i].toUpperCase()))
                    throw new Error(
                      "A pattern may not be defined more than once in the same scope!"
                    );
                  decls.add(tokens[i].toUpperCase());
                }
                stack.push(tokens[i]);
                break;
              case "q":
                if (stack.length && stack[stack.length - 1][0] === "p")
                  stack.pop();
                else stack.push(tokens[i]);
                break;
            }
          }
          if (stack.length)
            throw new SyntaxError(
              "Unmatched brackets and/or pattern definitions found"
            );
          var result;
          for (var _ = 0; _ < 2; _++) {
            result = [];
            for (var i = 0; i < tokens.length; i++) {
              if (tokens[i][0] === "p") {
                var pid = tokens[i].toUpperCase(),
                  patternDefinition = [],
                  unmatched = 1;
                while (unmatched) {
                  i++;
                  if (tokens[i][0] === "p") unmatched++;
                  else if (tokens[i][0] === "q") unmatched--;
                  if (tokens[i][0] != "q" || unmatched)
                    patternDefinition.push(tokens[i]);
                }
                try {
                  patterns[pid] = _convert(patternDefinition, patterns);
                } catch (e) {}
              } else result.push(tokens[i]);
            }
          }
          for (var _ = 0; _ < 10; _++) {
            var temp = [];
            for (var i = 0; i < result.length; i++) {
              switch (result[i][0]) {
                case "F":
                case "L":
                case "R":
                  var repeats = result[i].slice(1).length
                    ? +result[i].slice(1)
                    : 1;
                  for (var j = 0; j < repeats; j++) temp.push(result[i][0]);
                  break;
                case "(":
                  var subprogram = [],
                    brackets = 1;
                  while (brackets) {
                    i++;
                    if (result[i][0] === "(") brackets++;
                    else if (result[i][0] === ")") brackets--;
                    subprogram.push(result[i]);
                  }
                  subprogram.pop();
                  var repeats = result[i].slice(1).length
                    ? +result[i].slice(1)
                    : 1;
                  for (var j = 0; j < repeats; j++)
                    temp.splice(temp.length, 0, ...subprogram);
                  break;
                case "P":
                  if (typeof patterns[result[i]] != "undefined")
                    temp.splice(temp.length, 0, ...patterns[result[i]]);
                  else temp.push(result[i]);
                  break;
              }
            }
            if (temp.every((s) => s === "F" || s === "L" || s === "R"))
              return temp;
            result = temp;
          }
          return result;
        },
        result = _convert(tokens, {});
      if (result.some((s) => s !== "F" && s !== "L" && s !== "R"))
        throw new Error("Something went wrong");
      return result;
    }
    executeRaw(cmds) {
      // TODO: Execute the raw commands passed in and return a string
      // representation of the MyRobot's path
      var code = cmds.join``;
      var directions = ["right", "down", "left", "up"];
      var directionIndex = 0;
      var grid = [[0]];
      var robot = { x: 0, y: 0 };
      grid[robot.y][robot.x] = 1;
      for (var i = 0; i < code.length; i++) {
        switch (code[i]) {
          case "R":
            directionIndex = (directionIndex + 1) % 4;
            break;
          case "L":
            directionIndex = (directionIndex + 3) % 4;
            break;
          case "F":
            switch (directions[directionIndex]) {
              case "right":
                robot.x++;
                if (robot.x >= grid[robot.y].length) {
                  for (var k = 0; k < grid.length; k++) grid[k].push(0);
                }
                break;
              case "down":
                robot.y++;
                if (robot.y >= grid.length)
                  grid.push(Array(grid[0].length).fill(0));
                break;
              case "left":
                robot.x--;
                if (robot.x < 0) {
                  for (var k = 0; k < grid.length; k++)
                    grid[k] = [0].concat(grid[k]);
                  robot.x++;
                }
                break;
              case "up":
                robot.y--;
                if (robot.y < 0) {
                  grid = [Array(grid[0].length).fill(0)].concat(grid);
                  robot.y++;
                }
                break;
            }
            grid[robot.y][robot.x] = 1;
            break;
        }
      }
      return grid
        .map((r) => r.map((s) => (s === 1 ? "*" : " ")).join(""))
        .join("\r\n");
    }
    execute() {
      return this.executeRaw(this.convertToRaw(this.getTokens()));
    }
  }
  