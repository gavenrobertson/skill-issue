---
title: while and do-while Loops
summary: Repeating code while a condition holds, the three parts of every loop, infinite loops, sentinel-controlled loops, do-while (which always runs at least once), menu loops, and input validation loops.
---

A **loop** repeats a piece of code. C++ has three kinds: `while`, `do`-`while`, and `for` (plus
range-based `for`). You already met a minimal `while` when reading input until the end. Now let's look
at it properly.

## `while`

```cpp
while (condition) {
    // body
}
```

1. Evaluate the condition.
2. If it's `false`, skip the body and continue after the loop.
3. If it's `true`, run the body, then **go back to step 1**.

Each run of the body is called an **iteration**. Because the condition is checked *before* each
iteration, the body may run **zero times**.

```cpp run
#include <iostream>

int main() {
    int count = 1;              // 1. initialize
    while (count <= 5) {        // 2. test
        std::cout << count << ' ';
        ++count;                // 3. update
    }
    std::cout << "\nafter the loop, count = " << count << '\n';

    int n = 10;
    while (n < 5) {             // false right away: the body never runs
        std::cout << "never printed\n";
    }
}
```

```output
1 2 3 4 5 
after the loop, count = 6
```

Almost every loop has those three parts:

- **initialization**: set up the loop variable before the loop,
- **condition**: decide whether to do another iteration,
- **update**: change something in the body so the condition eventually becomes false.

The loop doesn't have to count. Here it repeatedly halves a number:

```cpp run
#include <iostream>

int main() {
    int n = 100;
    int steps = 0;
    while (n > 1) {
        n /= 2;
        ++steps;
        std::cout << n << ' ';
    }
    std::cout << "\n" << steps << " halvings\n";
}
```

```output
50 25 12 6 3 1 
6 halvings
```

And here it peels off the digits of a number, a pattern you'll use a lot:

```cpp run
#include <iostream>

int main() {
    int n = 4096;
    int sum = 0;
    while (n > 0) {
        sum += n % 10;   // last digit
        n /= 10;         // drop the last digit
    }
    std::cout << "digit sum: " << sum << '\n';
}
```

```output
digit sum: 19
```

## Infinite loops

If the condition never becomes false, the loop runs **forever**. The classic cause is forgetting the
update:

```cpp
int i = 0;
while (i < 10) {
    std::cout << i << '\n';
    // forgot ++i: i is 0 forever
}
```

Another one is a stray semicolon, which makes an **empty** loop body (GCC doesn't warn about this one):

```cpp
int i = 0;
while (i < 10);      // the ; is the body: loops forever doing nothing
{
    ++i;             // never reached
}
```

If your program seems to hang (or the IDE reports a timeout), look for a loop whose condition can't
become false.

Sometimes an endless loop is intentional: a server or game runs "forever" until something inside the
loop decides to stop. That's written `while (true)` and exited with `break` (covered in a later lesson):

```cpp
while (true) {
    // ... do work ...
    // if (time_to_stop) break;
}
```

## Sentinel-controlled loops

A **sentinel** is a special value that means "stop", for example "enter numbers, 0 to finish".
Combine the read and the sentinel test in the condition:

```cpp run
#include <iostream>

int main() {
    int x = 0;
    int sum = 0;
    while (std::cin >> x && x != 0) {
        sum += x;
    }
    std::cout << "sum = " << sum << '\n';
}
```

With the input `5 10 -3 0 99` it prints `sum = 12`: the loop stops at the `0`, and the `99` is never
read. The `std::cin >> x &&` part also stops the loop if the input ends (or is bad) before a `0`
appears, so the program never hangs waiting. Thanks to short-circuiting, `x != 0` is only tested
after a successful read.

## `do`-`while`

A `do`-`while` loop checks its condition **after** the body, so the body always runs **at least once**:

```cpp
do {
    // body
} while (condition);     // note the semicolon!
```

```cpp run
#include <iostream>

int main() {
    int n = 0;
    int digits = 0;
    do {
        ++digits;
        n /= 10;
    } while (n != 0);
    std::cout << "0 has " << digits << " digit\n";
}
```

```output
0 has 1 digit
```

With a plain `while (n != 0)`, the body would never run for `0`, and you'd get "0 digits". Whenever
"do it once, then decide whether to repeat" describes the problem, `do`-`while` is the natural fit.

Two syntax traps:

```cpp compile-error
#include <iostream>

int main() {
    int n = 3;
    do {
        --n;
    } while (n > 0)               // error: expected ';'
    std::cout << n << '\n';
}
```

```cpp compile-error
#include <iostream>

int main() {
    do {
        int answer = 0;
        std::cin >> answer;
    } while (answer != 42);       // error: 'answer' was not declared in this scope
}
```

The body is a block, so variables declared inside it no longer exist when the condition is checked.
Declare the variable **before** the `do`.

## A menu loop

Showing a menu, handling the choice, and repeating until the user quits is the textbook `do`-`while`:
you always show the menu at least once.

```cpp run
#include <iostream>

int main() {
    int balance = 100;
    int choice = 0;
    do {
        std::cout << "1) Show balance  2) Deposit 10  3) Withdraw 10  0) Quit\n";
        choice = 0;               // so that failed or missing input means "quit"
        std::cin >> choice;
        switch (choice) {
            case 1: std::cout << "Balance: " << balance << '\n'; break;
            case 2: balance += 10; std::cout << "Deposited.\n"; break;
            case 3: balance -= 10; std::cout << "Withdrew.\n"; break;
            case 0: std::cout << "Bye!\n"; break;
            default: std::cout << "Unknown choice.\n"; break;
        }
    } while (choice != 0);
}
```

With the input `2 1 0` it prints:

```output
1) Show balance  2) Deposit 10  3) Withdraw 10  0) Quit
Deposited.
1) Show balance  2) Deposit 10  3) Withdraw 10  0) Quit
Balance: 110
1) Show balance  2) Deposit 10  3) Withdraw 10  0) Quit
Bye!
```

Setting `choice = 0` before each read matters: if the input runs out, the read fails and leaves
`choice` alone, and without the reset the loop would repeat the last choice forever.

## Input validation loops

"Keep asking until the input is acceptable" is another classic. The loop body runs once per **bad**
answer:

```cpp run
#include <iostream>

int main() {
    int n = 0;
    std::cout << "Pick a number from 1 to 10: ";
    while (std::cin >> n && (n < 1 || n > 10)) {
        std::cout << n << " is out of range. Try again: ";
    }
    if (std::cin) {
        std::cout << "\nYou picked " << n << '\n';
    } else {
        std::cout << "\nNo valid number was entered.\n";
    }
}
```

With the input `0 42 7`, the output is:

```output
Pick a number from 1 to 10: 0 is out of range. Try again: 42 is out of range. Try again: 
You picked 7
```

After the loop, either the read failed (no more input, or not a number) or `n` is in range, and
`if (std::cin)` tells you which.

To also survive non-numeric input like `abc` (instead of stopping), combine this with
`std::cin.clear()` and `std::cin.ignore(...)` from the input lesson, and stop only at end of input.

## `while` or `do`-`while`?

| Use `while` when | Use `do`-`while` when |
| --- | --- |
| the body might not need to run at all | the body must run at least once |
| you test *before* acting (reading until EOF, processing while data remains) | you act, *then* decide whether to repeat (menus, "play again?", prompts) |

`while` is far more common. Reach for `do`-`while` when you notice you're duplicating the body's code
before a `while` loop just to get the first iteration.

:::quiz
How many times does `"hi"` print?

```cpp
int i = 10;
while (i < 10) {
    std::cout << "hi\n";
    ++i;
}
```

- [x] 0
- [ ] 1
- [ ] 10
- [ ] It loops forever

The condition `10 < 10` is false before the first iteration, so the body never runs.
:::

:::quiz
How many times does `"hi"` print?

```cpp
int i = 10;
do {
    std::cout << "hi\n";
    ++i;
} while (i < 10);
```

- [ ] 0
- [x] 1
- [ ] 10
- [ ] It loops forever

A `do`-`while` runs its body once before checking the condition for the first time.
:::

:::quiz
What does this print?

```cpp
int n = 3;
while (n > 0) {
    std::cout << n;
    n -= 2;
}
std::cout << ' ' << n;
```

- [ ] `321 0`
- [x] `31 -1`
- [ ] `31 1`
- [ ] It loops forever

`n` goes 3 → 1 → -1. The body runs for 3 and 1; at -1 the condition is false.
:::

:::exercise Countdown
Read `n` and count down from `n` to 1, one number per line, then print `Liftoff!`.

**Input:** one integer `n` (0 or more).
**Output:** the numbers `n`, `n-1`, ..., `1`, each on its own line, followed by `Liftoff!`.
For `n = 0`, only `Liftoff!` is printed.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << n << '\n';
    std::cout << "Liftoff!\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    while (n > 0) {
        std::cout << n << '\n';
        --n;
    }
    std::cout << "Liftoff!\n";
}
```

```hint
Loop `while (n > 0)`, printing `n` and then decreasing it with `--n`.
```

```stdin
3
```

```expected
3
2
1
Liftoff!
```

```stdin
0
```

```expected
Liftoff!
```

```stdin
1
```

```expected hidden
1
Liftoff!
```

```checks
must \bwhile\s*\( :: Use a while loop.
```
:::

:::exercise Sentinel sum
Read integers until a `0` appears (or the input ends) and print how many numbers came before it and
their sum. The `0` itself isn't counted, and anything after it is ignored.

**Input:** integers, normally ending with `0`.
**Output:** two lines:

```
Count: <how many>
Sum: <sum>
```

For input `5 3 0 100` the output is `Count: 2` and `Sum: 8`.

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    int sum = 0;
    while (std::cin >> x) {
        ++count;
        sum += x;
    }
    std::cout << "Count: " << count << '\n';
    std::cout << "Sum: " << sum << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    int sum = 0;
    while (std::cin >> x && x != 0) {
        ++count;
        sum += x;
    }
    std::cout << "Count: " << count << '\n';
    std::cout << "Sum: " << sum << '\n';
}
```

```hint
Extend the loop condition: keep going only while the read succeeds **and** the value isn't `0`.
```

```stdin
5 3 0 100
```

```expected
Count: 2
Sum: 8
```

```stdin
0
```

```expected
Count: 0
Sum: 0
```

```stdin
-4 10 -6 0
```

```expected hidden
Count: 3
Sum: 0
```

```stdin
4 4
```

```expected hidden
Count: 2
Sum: 8
```

```checks
must \bwhile\s*\( :: Use a while loop.
```
:::

:::exercise Digits
Read an integer (possibly 0 or negative) and print how many digits it has and the sum of its digits.
Use a `do`-`while` loop so that `0` correctly counts as one digit. The minus sign is not a digit.

**Input:** one integer `n` (between -1000000000 and 1000000000).
**Output:**

```
Digits: <count>
Digit sum: <sum>
```

For `-905`: `Digits: 3` and `Digit sum: 14`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    int digits = 0;
    int sum = 0;
    while (n > 0) {
        ++digits;
        sum += n % 10;
        n /= 10;
    }
    std::cout << "Digits: " << digits << '\n';
    std::cout << "Digit sum: " << sum << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    if (n < 0) {
        n = -n;
    }
    int digits = 0;
    int sum = 0;
    do {
        ++digits;
        sum += n % 10;
        n /= 10;
    } while (n != 0);
    std::cout << "Digits: " << digits << '\n';
    std::cout << "Digit sum: " << sum << '\n';
}
```

```hint
Make `n` non-negative first, so `n % 10` gives positive digits.
```

```hint
`do { ... } while (n != 0);` runs once even when `n` is 0.
```

```stdin
-905
```

```expected
Digits: 3
Digit sum: 14
```

```stdin
0
```

```expected
Digits: 1
Digit sum: 0
```

```stdin
1000000000
```

```expected hidden
Digits: 10
Digit sum: 1
```

```stdin
7
```

```expected hidden
Digits: 1
Digit sum: 7
```

```checks
must \bdo\s*\{ :: Use a do-while loop.
```
:::

:::exercise Validated input
Read integers until one between 1 and 10 (inclusive) is found. Report every rejected number, then the
accepted one.

**Input:** a sequence of integers.
**Output:**

- For each number outside 1 to 10 (before the first valid one): `<n> is out of range`.
- Then `Accepted: <n>` for the first valid number (ignore anything after it).
- If the input ends without any valid number: `No valid input` (after the rejection lines).

For input `15 -2 7 3`:

```
15 is out of range
-2 is out of range
Accepted: 7
```

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "Accepted: " << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    while (std::cin >> n && (n < 1 || n > 10)) {
        std::cout << n << " is out of range\n";
    }
    if (std::cin) {
        std::cout << "Accepted: " << n << '\n';
    } else {
        std::cout << "No valid input\n";
    }
}
```

```hint
Put the read and the range test in the loop condition: `while (std::cin >> n && (n < 1 || n > 10))`.
```

```hint
After the loop, `if (std::cin)` tells you whether it stopped at a valid number or at the end of input.
```

```stdin
15 -2 7 3
```

```expected
15 is out of range
-2 is out of range
Accepted: 7
```

```stdin
10
```

```expected
Accepted: 10
```

```stdin
0 11
```

```expected hidden
0 is out of range
11 is out of range
No valid input
```

```stdin
1
```

```expected hidden
Accepted: 1
```

```checks
must \bwhile\s*\( :: Use a loop.
```
:::
