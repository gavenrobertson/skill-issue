---
title: "Functions: Challenges"
summary: Hard problems built around recursion, helper functions and careful interfaces, from the k-th move of the Tower of Hanoi to a recursive expression evaluator.
---

These problems are meant to be **hard**. Most of them have a short recursive solution that is easy to
get *almost* right, and the hidden tests are there to find the "almost": huge inputs where only the
fast algorithm finishes, overflow, zero, negative numbers, and the order in which operations combine.

Split each program into small functions with clear parameters and return values. Try each problem
before you open the hints.

:::exercise Tower of Hanoi {hard}
Three pegs `A`, `B` and `C`; `n` disks of different sizes start on `A`, the largest at the bottom. Move
them all to `C`, one disk at a time, never placing a larger disk on a smaller one. The classic
recursive solution moves `n - 1` disks out of the way (to the spare peg), moves the largest disk, and
moves the `n - 1` disks back on top of it. It takes `2^n - 1` moves.

**Input:** two integers `n` and `k`.

- If `k` is `0`, print **every** move of the solution (`0 <= n <= 10`), then `Total: M moves` (always
  `moves`, even for `M = 1`).
- Otherwise print only the `k`-th move (counting from 1) of the same solution, for `1 <= n <= 62`. If
  `k` is larger than `2^n - 1`, print `invalid`. (For big `n` there are far too many moves to simulate
  them all: find the `k`-th one directly.)

Each move is printed as `Move disk D from X to Y`, where disk 1 is the smallest. For `3 0`:

```
Move disk 1 from A to C
Move disk 2 from A to B
Move disk 1 from C to B
Move disk 3 from A to C
Move disk 1 from B to A
Move disk 2 from B to C
Move disk 1 from A to C
Total: 7 moves
```

For `3 4` the output is just `Move disk 3 from A to C`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    long long k = 0;
    std::cin >> n >> k;
    std::cout << "Total: " << n << " moves\n";
}
```

```cpp solution
#include <iostream>

void printMove(int disk, char from, char to) {
    std::cout << "Move disk " << disk << " from " << from << " to " << to << '\n';
}

// Moves disks 1..n from 'from' to 'to', printing every move.
void solve(int n, char from, char to, char via) {
    if (n == 0) {
        return;
    }
    solve(n - 1, from, via, to);
    printMove(n, from, to);
    solve(n - 1, via, to, from);
}

// Prints only the k-th move (1-based) of solve(n, from, to, via).
void kthMove(int n, long long k, char from, char to, char via) {
    long long half = 1LL << (n - 1);          // moves before the largest disk moves, plus one
    if (k == half) {
        printMove(n, from, to);
    } else if (k < half) {
        kthMove(n - 1, k, from, via, to);
    } else {
        kthMove(n - 1, k - half, via, to, from);
    }
}

int main() {
    int n = 0;
    long long k = 0;
    std::cin >> n >> k;
    if (k == 0) {
        solve(n, 'A', 'C', 'B');
        std::cout << "Total: " << (1LL << n) - 1 << " moves\n";
    } else if (k > (1LL << n) - 1) {
        std::cout << "invalid\n";
    } else {
        kthMove(n, k, 'A', 'C', 'B');
    }
}
```

```hint
Listing all moves: `solve(n, from, to, via)` calls `solve(n - 1, from, via, to)`, prints the move of
disk `n`, then calls `solve(n - 1, via, to, from)`. The base case is `n == 0`: nothing to do.
```

```hint
The first `2^(n-1) - 1` moves belong to the first recursive call, move number `2^(n-1)` moves disk `n`,
and the rest belong to the second call. So the `k`-th move can be found by recursing into just **one**
half, about `n` calls instead of `2^n`.
```

```hint
`1LL << n` is `2^n` as a `long long` (`1 << n` would be an `int` and overflow for `n >= 31`).
```
```stdin
3 0
```

```expected
Move disk 1 from A to C
Move disk 2 from A to B
Move disk 1 from C to B
Move disk 3 from A to C
Move disk 1 from B to A
Move disk 2 from B to C
Move disk 1 from A to C
Total: 7 moves
```

```stdin
3 4
```

```expected
Move disk 3 from A to C
```

```stdin
0 0
```

```expected hidden
Total: 0 moves
```

```stdin
1 0
```

```expected hidden
Move disk 1 from A to C
Total: 1 moves
```

```stdin
2 0
```

```expected hidden
Move disk 1 from A to B
Move disk 2 from A to C
Move disk 1 from B to C
Total: 3 moves
```

```stdin
3 7
```

```expected hidden
Move disk 1 from A to C
```

```stdin
3 8
```

```expected hidden
invalid
```

```stdin
10 1
```

```expected hidden
Move disk 1 from A to B
```

```stdin
62 2305843009213693952
```

```expected hidden
Move disk 62 from A to C
```

```stdin
62 4611686018427387903
```

```expected hidden
Move disk 1 from B to C
```

```stdin
62 4611686018427387904
```

```expected hidden
invalid
```

```stdin
40 123456789
```

```expected hidden
Move disk 1 from B to C
```

:::

:::exercise Modular power {hard}
Compute `a^b mod m` for very large exponents, as needed in cryptography.

**Input:** lines of three integers `a b m` until the end of input, with `-10^18 <= a <= 10^18`,
`0 <= b <= 10^18` and `1 <= m <= 10^9`.
**Output:** for each line, `a^b mod m` as a number from `0` to `m - 1` (also when `a` is negative), on
its own line. As usual `a^0 = 1`, so `5 0 7` gives `1`, but `5 0 1` gives `0`.

Write a **recursive** function `long long powMod(long long a, long long b, long long m)` using
exponentiation by squaring. A loop doing `b` multiplications would take years for `b = 10^18`.

| Input | Output |
| --- | --- |
| `2 10 1000` | `24` |
| `3 200 13` | `9` |
| `-2 3 5` | `2` |

```cpp starter
#include <iostream>

int main() {
    long long a = 0, b = 0, m = 0;
    while (std::cin >> a >> b >> m) {
        long long result = 1;
        for (long long i = 0; i < b; ++i) {
            result = result * a % m;
        }
        std::cout << result << '\n';
    }
}
```

```cpp solution
#include <iostream>

long long powMod(long long a, long long b, long long m) {
    if (b == 0) {
        return 1 % m;
    }
    long long half = powMod(a, b / 2, m);
    long long result = half * half % m;
    if (b % 2 == 1) {
        result = result * a % m;
    }
    return result;
}

int main() {
    long long a = 0, b = 0, m = 0;
    while (std::cin >> a >> b >> m) {
        long long base = (a % m + m) % m;      // 0 to m - 1, also for negative a
        std::cout << powMod(base, b, m) << '\n';
    }
}
```

```hint
`a^b = (a^(b/2))^2` when `b` is even, and `a * (a^(b/2))^2` when `b` is odd. Compute `a^(b/2)` **once**,
store it, and square it.
```

```hint
Reduce modulo `m` after every multiplication. Since every value is below `m <= 10^9`, a product is below
`10^18` and fits in a `long long`.
```

```hint
Bring `a` into the range `0` to `m - 1` first: `(a % m + m) % m` (in C++ `-2 % 5` is `-2`). And watch the
case `m = 1`, where every answer is `0`, even `a^0`.
```

```stdin
2 10 1000
3 200 13
-2 3 5
```

```expected
24
9
2
```

```stdin
5 0 7
5 0 1
0 0 3
```

```expected hidden
1
0
1
```

```stdin
2 1000000000000000000 1000000007
```

```expected hidden
719476260
```

```stdin
-1000000000000000000 999999999999999999 999999937
```

```expected hidden
898663894
```

```stdin
123456789 0 1
7 1 1000000000
999999999 2 1000000000
```

```expected hidden
0
7
1
```

```stdin
-1 1 2
-3 2 7
```

```expected hidden
1
2
```

```checks
must long\s+long\s+powMod\s*\([^)]*\)\s*\{[\s\S]*powMod\s*\( :: Write a recursive long long powMod(long long a, long long b, long long m).
```
:::

:::exercise GCD and LCM of a list {hard}
Compute the greatest common divisor and the least common multiple of a list of integers.

**Input:** integers until the end of input, each with `|x| <= 10^18`.
**Output:**

- `no numbers` if the input is empty.
- Otherwise two lines, `gcd: G` and `lcm: L`, for the **absolute values** of the numbers:
  - `gcd(0, x) = x`, so the gcd is 0 only if every number is 0.
  - If any number is `0`, the lcm is `0`.
  - Otherwise, if the lcm is larger than `10^18`, print `lcm: overflow`.

| Input | Output |
| --- | --- |
| `12 18 30` | `gcd: 6` / `lcm: 180` |
| `-4 6` | `gcd: 2` / `lcm: 12` |
| `0 5` | `gcd: 5` / `lcm: 0` |

Write the gcd as a **recursive** function (Euclid: `gcd(a, b) = gcd(b, a % b)`, `gcd(a, 0) = a`).

```cpp starter
#include <iostream>

int main() {
    long long x = 0;
    long long g = 0;
    while (std::cin >> x) {
        g = x;
    }
    std::cout << "gcd: " << g << '\n';
}
```

```cpp solution
#include <iostream>

long long gcd(long long a, long long b) {
    if (b == 0) {
        return a;
    }
    return gcd(b, a % b);
}

int main() {
    const long long limit = 1000000000000000000LL;   // 10^18
    long long x = 0;
    long long g = 0;
    long long l = 1;
    bool any = false, zero = false, overflow = false;

    while (std::cin >> x) {
        any = true;
        if (x < 0) {
            x = -x;
        }
        g = gcd(g, x);
        if (x == 0) {
            zero = true;
        } else if (!overflow) {
            long long step = l / gcd(l, x);          // lcm(l, x) = step * x
            if (step > limit / x) {
                overflow = true;
            } else {
                l = step * x;
            }
        }
    }

    if (!any) {
        std::cout << "no numbers\n";
        return 0;
    }
    std::cout << "gcd: " << g << '\n';
    if (zero) {
        std::cout << "lcm: 0\n";
    } else if (overflow) {
        std::cout << "lcm: overflow\n";
    } else {
        std::cout << "lcm: " << l << '\n';
    }
}
```

```hint
Fold the list: start with `g = 0` (since `gcd(0, x) = x`) and `l = 1`, then combine every number into
both.
```

```hint
`lcm(a, b) = a / gcd(a, b) * b`. Divide **first**: `a * b` can overflow even when the lcm fits.
```

```hint
To check `p * q > limit` without computing the overflowing product, check `p > limit / q` instead.
```

```stdin
12 18 30
```

```expected
gcd: 6
lcm: 180
```

```stdin
-4 6
```

```expected
gcd: 2
lcm: 12
```

```stdin
0 5
```

```expected
gcd: 5
lcm: 0
```

```stdin
```

```expected hidden
no numbers
```

```stdin
0 0
```

```expected hidden
gcd: 0
lcm: 0
```

```stdin
7
```

```expected hidden
gcd: 7
lcm: 7
```

```stdin
1000000007 998244353 1000000009
```

```expected hidden
gcd: 1
lcm: overflow
```

```stdin
1000000007 998244353 1000000009 0
```

```expected hidden
gcd: 1
lcm: 0
```

```stdin
1000000000000000000 1
```

```expected hidden
gcd: 1
lcm: 1000000000000000000
```

```stdin
1000000000000000000 3
```

```expected hidden
gcd: 1
lcm: overflow
```

```stdin
-1000000000000000000 -500000000000000000
```

```expected hidden
gcd: 500000000000000000
lcm: 1000000000000000000
```

```stdin
6 10 15 -21
```

```expected hidden
gcd: 1
lcm: 210
```

```checks
must long\s+long\s+gcd\s*\([^)]*\)\s*\{[\s\S]*gcd\s*\( :: Write a recursive gcd function.
```
:::

:::exercise Digital roots {hard}
Replace a number by the **sum** of its digits again and again until one digit is left: that digit is the
**digital root**, and the number of replacements is the **additive persistence**. Doing the same with
the **product** of the digits gives the **multiplicative root** and **multiplicative persistence**.

For 39: `39 → 12 → 3` (root 3 after 2 steps) and `39 → 27 → 14 → 4` (root 4 after 3 steps).

**Input:** non-negative integers until the end of input, each at most `10^18`.
**Output:** one line per number:

```
39: sum root 3 after 2 steps, product root 4 after 3 steps
```

(`1 step` for exactly one step.) A single-digit number is its own root after 0 steps.

Write it with **recursive** functions only (digit sum, digit product, and the two root/persistence
computations), no loops apart from the input loop in `main`.

```cpp starter
#include <iostream>

int main() {
    long long n = 0;
    while (std::cin >> n) {
        std::cout << n << ": sum root " << n % 9 << " after 1 steps, product root 0 after 1 steps\n";
    }
}
```

```cpp solution
#include <iostream>
#include <string>

long long digitSum(long long n) {
    if (n < 10) return n;
    return n % 10 + digitSum(n / 10);
}

long long digitProduct(long long n) {
    if (n < 10) return n;
    return n % 10 * digitProduct(n / 10);
}

// Returns the number of steps; stores the final single digit in 'root'.
int sumPersistence(long long n, long long& root) {
    if (n < 10) {
        root = n;
        return 0;
    }
    return 1 + sumPersistence(digitSum(n), root);
}

int productPersistence(long long n, long long& root) {
    if (n < 10) {
        root = n;
        return 0;
    }
    return 1 + productPersistence(digitProduct(n), root);
}

std::string stepsText(int steps) {
    return std::to_string(steps) + (steps == 1 ? " step" : " steps");
}

int main() {
    long long n = 0;
    while (std::cin >> n) {
        long long sumRoot = 0, productRoot = 0;
        int a = sumPersistence(n, sumRoot);
        int p = productPersistence(n, productRoot);
        std::cout << n << ": sum root " << sumRoot << " after " << stepsText(a)
                  << ", product root " << productRoot << " after " << stepsText(p) << '\n';
    }
}
```

```hint
`digitSum(n)` is `n % 10 + digitSum(n / 10)`, with single digits as the base case. The product works
the same way with `*`.
```

```hint
The persistence of `n` is 0 for a single digit, and otherwise `1 +` the persistence of its digit sum
(or product). A reference parameter can hand back the root at the same time.
```

```hint
Watch the digit `0`: any number containing a 0 has digit product 0, so its product root is 0 after one
step.
```

```stdin
39
```

```expected
39: sum root 3 after 2 steps, product root 4 after 3 steps
```

```stdin
0
9
10
```

```expected hidden
0: sum root 0 after 0 steps, product root 0 after 0 steps
9: sum root 9 after 0 steps, product root 9 after 0 steps
10: sum root 1 after 1 step, product root 0 after 1 step
```

```stdin
9875
```

```expected hidden
9875: sum root 2 after 3 steps, product root 0 after 2 steps
```

```stdin
999999999999999999
```

```expected hidden
999999999999999999: sum root 9 after 2 steps, product root 0 after 2 steps
```

```stdin
277777788888899
```

```expected hidden
277777788888899: sum root 2 after 2 steps, product root 0 after 11 steps
```

```stdin
1000000000000000000
```

```expected hidden
1000000000000000000: sum root 1 after 1 step, product root 0 after 1 step
```

```stdin
25
```

```expected hidden
25: sum root 7 after 1 step, product root 0 after 2 steps
```

```checks
mustnot \bfor\s*\( :: Use recursion instead of for loops.
must long\s+long\s+digitSum\s*\([^)]*\)\s*\{[\s\S]*digitSum\s*\( :: Write a recursive digitSum.
```
:::

:::exercise Expression evaluator {hard}
Evaluate arithmetic expressions such as `2 * (3 + 4) - 10 / 3`, with the usual rules: `*` and `/` bind
tighter than `+` and `-`, operators of the same kind are applied **left to right** (`10 - 2 - 3` is 5),
and parentheses group.

**Input:** lines until the end of input, each holding one expression made of non-negative integer
literals, `+ - * /`, parentheses, a unary minus (as in `-(2 + 3)` or `4 * -2`) and spaces.
**Output:** one line per expression:

- its value, using C++ `long long` arithmetic (division truncates toward zero, so `-7 / 2` is `-3`),
- `error: division by zero` if a division by zero happens,
- `error: syntax` if the line isn't a valid expression (an empty line, a missing parenthesis, two
  operators in a row, or anything left over after a complete expression, like `12 34`).

Report only the **first** problem found, reading from left to right. Results always fit in a
`long long`.

The classic way to do this is a **recursive descent** parser: one function per precedence level.

```
expression = term,   then any number of  (+ or -) term
term       = factor, then any number of  (* or /) factor
factor     = number  |  ( expression )  |  - factor
```

`factor` calls `expression` for parentheses, and `expression` calls `term`, which calls `factor`, so you
need a **declaration** of one of them before the others are defined.

| Input | Output |
| --- | --- |
| `1 + 2 * 3` | `7` |
| `(1 + 2) * 3` | `9` |
| `7 / 2 - -3` | `6` |
| `(1 + 2` | `error: syntax` |

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << line << '\n';
    }
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <string>

// Every parse function reads from 'text' starting at 'pos' and advances 'pos'.
// On a problem it stores a message in 'error' (only the first one) and returns 0.
long long expression(const std::string& text, std::size_t& pos, std::string& error);

void skipSpaces(const std::string& text, std::size_t& pos) {
    while (pos < text.size() && text[pos] == ' ') {
        ++pos;
    }
}

bool isDigit(char c) {
    return c >= '0' && c <= '9';
}

long long factor(const std::string& text, std::size_t& pos, std::string& error) {
    skipSpaces(text, pos);
    if (pos < text.size() && text[pos] == '-') {
        ++pos;
        return -factor(text, pos, error);
    }
    if (pos < text.size() && text[pos] == '(') {
        ++pos;
        long long value = expression(text, pos, error);
        if (!error.empty()) return 0;
        skipSpaces(text, pos);
        if (pos >= text.size() || text[pos] != ')') {
            error = "syntax";
            return 0;
        }
        ++pos;
        return value;
    }
    if (pos < text.size() && isDigit(text[pos])) {
        long long value = 0;
        while (pos < text.size() && isDigit(text[pos])) {
            value = value * 10 + (text[pos] - '0');
            ++pos;
        }
        return value;
    }
    error = "syntax";
    return 0;
}

long long term(const std::string& text, std::size_t& pos, std::string& error) {
    long long value = factor(text, pos, error);
    while (error.empty()) {
        skipSpaces(text, pos);
        if (pos >= text.size() || (text[pos] != '*' && text[pos] != '/')) {
            break;
        }
        char op = text[pos];
        ++pos;
        long long right = factor(text, pos, error);
        if (!error.empty()) break;
        if (op == '*') {
            value *= right;
        } else if (right == 0) {
            error = "division by zero";
        } else {
            value /= right;
        }
    }
    return error.empty() ? value : 0;
}

long long expression(const std::string& text, std::size_t& pos, std::string& error) {
    long long value = term(text, pos, error);
    while (error.empty()) {
        skipSpaces(text, pos);
        if (pos >= text.size() || (text[pos] != '+' && text[pos] != '-')) {
            break;
        }
        char op = text[pos];
        ++pos;
        long long right = term(text, pos, error);
        if (op == '+') {
            value += right;
        } else {
            value -= right;
        }
    }
    return error.empty() ? value : 0;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::size_t pos = 0;
        std::string error;
        long long value = expression(line, pos, error);
        skipSpaces(line, pos);
        if (error.empty() && pos != line.size()) {
            error = "syntax";                     // something left over
        }
        if (error.empty()) {
            std::cout << value << '\n';
        } else {
            std::cout << "error: " << error << '\n';
        }
    }
}
```

```hint
Pass the line and the current position **by reference** to every function (`std::size_t& pos`), so
each function continues where the previous one stopped. A third reference parameter can carry the
first error message back up.
```

```hint
Left to right: `expression` reads one `term`, then **loops** while the next character is `+` or `-`,
reading another `term` each time and combining it with the value so far. Making it recursive on the
right instead (`term + expression`) would compute `10 - 2 - 3` as `10 - (2 - 3)`.
```

```hint
After the top-level `expression` returns, skip spaces: if you're not at the end of the line, there was
something left over, which is a syntax error.
```

```stdin
1 + 2 * 3
(1 + 2) * 3
7 / 2 - -3
(1 + 2
```

```expected
7
9
6
error: syntax
```

```stdin
10 - 2 - 3
100 / 10 / 5
-7 / 2
((((5))))
```

```expected hidden
5
2
-3
5
```

```stdin
1 / 0
1 + * 2

12 34
)
```

```expected hidden
error: division by zero
error: syntax
error: syntax
error: syntax
error: syntax
```

```stdin
2 * (3 + 4) * 5 - 100 / 7
-(4 - 10) / 4
999999999 * 999999999
```

```expected hidden
56
1
999999998000000001
```

```stdin
  42  
1/(2-2)+(
(1 + 2) / (3 - 3)
4 * -2 - -(-3)
```

```expected hidden
42
error: division by zero
error: division by zero
-11
```

```stdin
1 +
(()
7 % 2
0
```

```expected hidden
error: syntax
error: syntax
error: syntax
0
```

```checks
must long\s+long\s+\w+\s*\([^)]*\)\s*; :: Declare a function before defining it (the parse functions call each other).
```
:::

:::quiz
Which overloads are called, in order?

```cpp
void f(int)         { std::cout << "int "; }
void f(long)        { std::cout << "long "; }
void f(double)      { std::cout << "double "; }
void f(bool)        { std::cout << "bool "; }
void f(const char*) { std::cout << "ptr "; }

f('a'); f(2.5f); f(0L); f("x"); f(3u > 2);
```

- [x] `int double long ptr bool`
- [ ] `int double int ptr int`
- [ ] It doesn't compile: `f('a')` is ambiguous
- [ ] `int double long bool bool`

`char` to `int` and `float` to `double` are promotions, which beat every other conversion. `0L` is
already a `long`, `"x"` becomes a `const char*` (an exact match after the array-to-pointer step), and a
comparison has type `bool`.
:::

:::quiz
What does this print?

```cpp
int depth(int n) {
    static int calls = 0;
    ++calls;
    if (n == 0) {
        return calls;
    }
    int r = depth(n - 1);
    return r + calls;
}

int main() {
    std::cout << depth(3);
}
```

- [ ] `10`
- [ ] `4`
- [x] `16`
- [ ] `7`

There is only **one** `calls`, shared by every call. All four calls increment it on the way down, so by
the time anything returns it is 4: `depth(0)` returns 4, and each level on the way back up adds 4:
`4 + 4 + 4 + 4 = 16`.
:::
