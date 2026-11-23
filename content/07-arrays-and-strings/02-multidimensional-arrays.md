---
title: Multidimensional Arrays
summary: Grids and tables with 2D arrays. Declaring, initializing, nested loops, how they're laid out in memory, and passing them to functions.
---

## Arrays of arrays

A chessboard, a spreadsheet, the pixels of an image: lots of data comes as a **grid** of rows and
columns. In C++ a 2D array is literally an **array of arrays**:

```cpp
int grid[3][4];   // 3 rows, each row is an array of 4 ints: 12 ints total
```

Read the type from the name outwards: `grid` is an array of 3 elements, and each element is an
`int[4]`. You access an element with two indexes, **row first, then column**: `grid[row][col]`.

```cpp run
#include <iostream>

int main() {
    int grid[3][4] = {
        {1, 2, 3, 4},       // row 0
        {5, 6, 7, 8},       // row 1
        {9, 10, 11, 12},    // row 2
    };

    std::cout << grid[0][0] << '\n';   // top-left
    std::cout << grid[1][2] << '\n';   // row 1, column 2
    std::cout << grid[2][3] << '\n';   // bottom-right

    grid[1][2] = 70;
    std::cout << grid[1][2] << '\n';
}
```

```output
1
7
12
70
```

## Every way to initialize

```cpp run
#include <iostream>

int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};   // nested braces: one pair per row (clearest)
    int b[2][3] = {1, 2, 3, 4, 5, 6};       // flat list: fills row by row
    int c[2][3] = {{1}, {4, 5}};            // missing elements are zero: {{1,0,0},{4,5,0}}
    int d[2][3] = {};                       // all zero
    int e[2][3]{};                          // all zero
    int f[][3] = {{1, 2, 3}, {4, 5, 6}};    // only the FIRST size can be omitted

    std::cout << a[1][0] << ' ' << b[1][0] << ' ' << c[0][1] << ' ' << c[1][1] << ' '
              << d[1][2] << ' ' << e[0][0] << ' ' << f[1][2] << '\n';
}
```

```output
4 4 0 5 0 0 6
```

Only the outermost size can be deduced. The compiler needs to know how long each row is:

```cpp compile-error
int main() {
    int m[2][] = {{1, 2}, {3, 4}};   // error: declaration of 'm' as multidimensional array must have bounds for all dimensions except the first
}
```

## Looping with nested loops

The outer loop walks the rows, the inner loop walks the columns of the current row:

```cpp run
#include <iostream>

int main() {
    constexpr int kRows = 3;
    constexpr int kCols = 4;
    int table[kRows][kCols];

    // fill: a multiplication table
    for (int r = 0; r < kRows; ++r) {
        for (int c = 0; c < kCols; ++c) {
            table[r][c] = (r + 1) * (c + 1);
        }
    }

    // print, one row per line
    for (int r = 0; r < kRows; ++r) {
        for (int c = 0; c < kCols; ++c) {
            std::cout << table[r][c] << '\t';
        }
        std::cout << '\n';
    }
}
```

```output
1	2	3	4
2	4	6	8
3	6	9	12
```

(Each line ends with a tab before the newline; trailing whitespace doesn't show.)

### Range-for over a 2D array

Each element of the outer array is a row, which is itself an array. Take it **by reference**;
otherwise the row would decay to a pointer and the inner loop couldn't iterate it:

```cpp run
#include <iostream>

int main() {
    int grid[2][3] = {{1, 2, 3}, {4, 5, 6}};

    for (const auto& row : grid) {      // row is a const int(&)[3]
        for (int value : row) {
            std::cout << value << ' ';
        }
        std::cout << '\n';
    }
}
```

```output
1 2 3
4 5 6
```

```cpp compile-error
int main() {
    int grid[2][3] = {};
    for (auto row : grid) {        // row is an int* (decayed): it has no size
        for (int value : row) {    // error: 'begin' was not declared in this scope
            (void)value;
        }
    }
}
```

`std::size(grid)` is the number of rows and `std::size(grid[0])` the number of columns.

## Row-major layout

Memory is one-dimensional, so how does a grid fit? C++ stores the rows **one after another**
(row-major order). For `int grid[3][4]`:

```
grid[0][0] grid[0][1] grid[0][2] grid[0][3] | grid[1][0] grid[1][1] ... | grid[2][0] ... grid[2][3]
<------------------ row 0 ----------------> <------- row 1 ----------> <------- row 2 --------->
```

Element `[r][c]` is the `r * 4 + c`-th int. Two consequences:

- The whole grid is contiguous: `sizeof(grid)` is `3 * 4 * sizeof(int)`.
- Looping **row by row** (outer loop on rows, inner on columns) visits memory in order, which is
  much faster for big grids than going column by column, thanks to the CPU cache.

You can use the same formula yourself to store a grid in a 1D array:

```cpp run
#include <iostream>

int main() {
    constexpr int kRows = 2;
    constexpr int kCols = 3;
    int flat[kRows * kCols] = {1, 2, 3, 4, 5, 6};

    int r = 1;
    int c = 2;
    std::cout << flat[r * kCols + c] << '\n';   // same as grid[1][2] in a 2x3 grid
}
```

```output
6
```

## Passing 2D arrays to functions

The outer array decays to a pointer to its first **row**, so the function must know the row length
(every size except the first) at compile time. The number of rows is passed separately:

```cpp run
#include <iostream>

constexpr int kCols = 3;

int total(const int grid[][kCols], int rows) {   // really: const int (*grid)[3]
    int sum = 0;
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < kCols; ++c) {
            sum += grid[r][c];
        }
    }
    return sum;
}

void clearRow(int grid[][kCols], int row) {      // can modify the caller's grid
    for (int c = 0; c < kCols; ++c) {
        grid[row][c] = 0;
    }
}

int main() {
    int g[2][kCols] = {{1, 2, 3}, {4, 5, 6}};
    std::cout << total(g, 2) << '\n';
    clearRow(g, 0);
    std::cout << total(g, 2) << '\n';
}
```

```output
21
15
```

Leaving out the column count is an error, and a grid with a different column count doesn't match:

```cpp compile-error
int total(const int grid[][], int rows);   // error: multidimensional array must have bounds for all dimensions except the first

int main() {}
```

This rigidity is a big reason real programs use `std::vector<std::vector<int>>` or a flat
`std::vector` with the `r * cols + c` trick for grids whose size is only known at run time.

## More dimensions

You can keep going: `int cube[2][3][4];` is 2 blocks of 3 rows of 4 columns, accessed as
`cube[i][j][k]` with three nested loops. Beyond 3 dimensions it's rare.

:::quiz
In `int m[4][6];`, how many rows and columns are there, and what is the last valid element?

- [ ] 6 rows, 4 columns, `m[6][4]`
- [x] 4 rows, 6 columns, `m[3][5]`
- [ ] 4 rows, 6 columns, `m[4][6]`
- [ ] 24 rows, 1 column, `m[23][0]`

The first size is the number of rows. Indexes go from 0 to size - 1 in each dimension.
:::

:::quiz
Which function parameter can receive `int grid[5][8]`?

- [ ] `void f(int grid[][])`
- [ ] `void f(int grid[5][])`
- [x] `void f(int grid[][8], int rows)`
- [ ] `void f(int grid[], int rows, int cols)`

All dimensions except the first must be given. A plain `int[]` parameter expects a 1D array.
:::

:::exercise Row and column sums
Read `R` and `C` (1 to 10), then an `R` × `C` grid of integers into `int grid[10][10]`. Print the sum
of each row on one line, then the sum of each column on a second line, separated by spaces.

**Input:** `R C`, then `R` lines of `C` integers.
**Output:** line 1: `R` row sums; line 2: `C` column sums.

```cpp starter
#include <iostream>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    int grid[10][10];
}
```

```cpp solution
#include <iostream>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    int grid[10][10];
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            std::cin >> grid[r][c];
        }
    }

    for (int r = 0; r < rows; ++r) {
        int sum = 0;
        for (int c = 0; c < cols; ++c) {
            sum += grid[r][c];
        }
        std::cout << sum << (r + 1 < rows ? " " : "\n");
    }
    for (int c = 0; c < cols; ++c) {
        int sum = 0;
        for (int r = 0; r < rows; ++r) {
            sum += grid[r][c];
        }
        std::cout << sum << (c + 1 < cols ? " " : "\n");
    }
}
```

```hint
For row sums, the outer loop is over rows. For column sums, swap the loops: outer over columns, inner over rows.
```

```stdin
2 3
1 2 3
4 5 6
```

```expected
6 15
5 7 9
```

```stdin
1 1
-7
```

```expected hidden
-7
-7
```

```stdin
3 2
1 -1
2 -2
3 -3
```

```expected hidden
0 0 0
6 -6
```

```checks
must \w+\s*\[\s*\w+\s*\]\s*\[\s*\w+\s*\] :: Use a 2D array and two indexes.
```
:::

:::exercise Transpose
Read `R` and `C` (1 to 10) and an `R` × `C` grid. Print its **transpose**: a `C` × `R` grid where
row `i` is column `i` of the original. Separate numbers with single spaces.

**Input:** `R C`, then `R` lines of `C` integers.
**Output:** `C` lines with `R` integers each.

```cpp starter
#include <iostream>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    int m[10][10];
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            std::cin >> m[r][c];
        }
    }
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            std::cout << m[r][c] << (c + 1 < cols ? " " : "\n");
        }
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    int m[10][10];
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            std::cin >> m[r][c];
        }
    }
    for (int c = 0; c < cols; ++c) {
        for (int r = 0; r < rows; ++r) {
            std::cout << m[r][c] << (r + 1 < rows ? " " : "\n");
        }
    }
}
```

```hint
Swap which index the outer loop controls: loop over columns first, then rows.
```

```stdin
2 3
1 2 3
4 5 6
```

```expected
1 4
2 5
3 6
```

```stdin
1 4
9 8 7 6
```

```expected hidden
9
8
7
6
```

```stdin
2 2
1 2
2 1
```

```expected hidden
1 2
2 1
```
:::

:::exercise Tic-tac-toe referee
Read a 3×3 tic-tac-toe board as three lines of three characters (`X`, `O` or `.`) into a
`char board[3][3]`. Write `char winner(const char board[][3])` that returns `'X'` or `'O'` if that
player has three in a row (any row, column or diagonal), or `'.'` if nobody does. You may assume at
most one player has a line.

**Input:** three lines, each with exactly three characters.
**Output:** `X wins`, `O wins`, or `no winner`.

```cpp starter
#include <iostream>

int main() {
    char board[3][3];
    for (int r = 0; r < 3; ++r) {
        for (int c = 0; c < 3; ++c) {
            std::cin >> board[r][c];
        }
    }
    std::cout << "no winner\n";
}
```

```cpp solution
#include <iostream>

char winner(const char board[][3]) {
    for (int i = 0; i < 3; ++i) {
        if (board[i][0] != '.' && board[i][0] == board[i][1] && board[i][1] == board[i][2]) {
            return board[i][0];
        }
        if (board[0][i] != '.' && board[0][i] == board[1][i] && board[1][i] == board[2][i]) {
            return board[0][i];
        }
    }
    if (board[1][1] != '.') {
        if (board[0][0] == board[1][1] && board[1][1] == board[2][2]) return board[1][1];
        if (board[0][2] == board[1][1] && board[1][1] == board[2][0]) return board[1][1];
    }
    return '.';
}

int main() {
    char board[3][3];
    for (int r = 0; r < 3; ++r) {
        for (int c = 0; c < 3; ++c) {
            std::cin >> board[r][c];
        }
    }
    char w = winner(board);
    if (w == '.') {
        std::cout << "no winner\n";
    } else {
        std::cout << w << " wins\n";
    }
}
```

```hint
`std::cin >> ch` reads one non-whitespace character, so the nested loop reads the board cell by cell.
```

```hint
Check each row and column in one loop over `i`, then the two diagonals through the center `board[1][1]`.
```

```stdin
XOX
.X.
O.X
```

```expected
X wins
```

```stdin
XXO
.O.
OX.
```

```expected hidden
O wins
```

```stdin
XOX
XOO
OXX
```

```expected hidden
no winner
```

```stdin
O.X
O.X
..X
```

```expected hidden
X wins
```

```checks
must char\s+winner\s*\(\s*const\s+char\s+\w+\s*\[\s*\]\s*\[\s*3\s*\]\s*\) :: Write char winner(const char board[][3]).
```
:::
