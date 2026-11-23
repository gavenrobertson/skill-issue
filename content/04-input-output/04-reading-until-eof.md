---
title: Reading Until the End of Input
summary: Processing an unknown amount of input with while (std::cin >> x) and while (std::getline(...)), summing and counting, the "N, then N values" pattern, and why while (!std::cin.eof()) is a bug.
---

So far every program has read a fixed number of values. Real input often has an **unknown** amount:
a list of numbers, a file of lines, everything the user types until they stop. To handle that you
need two things: a way to repeat code, and a way to notice that the input has run out.

## End of input (EOF)

When there's nothing left to read, the input is at **end of file**, or **EOF** (the name comes from
files, but it applies to any input stream):

- In the IDE, EOF is simply the end of the text in the **Input (stdin)** box.
- When input comes from a file (`./prog < data.txt`), EOF is the end of the file.
- When typing in a terminal, you signal EOF with **Ctrl+D** (Linux/macOS) or **Ctrl+Z then Enter** (Windows).

As you saw in the `std::cin` lesson, a read at EOF **fails**: the stream sets its fail flag and
`std::cin >> x` evaluates to "false".

## A minimal `while` loop

A `while` loop repeats its body **as long as a condition is true**:

```cpp
while (condition) {
    // body: runs again and again while condition is true
}
```

The condition is checked **before** each repetition. When it's false, the program continues after the
closing `}`. The Control Flow module covers loops in depth; here's the basic shape:

```cpp run
#include <iostream>

int main() {
    int i = 1;
    while (i <= 3) {
        std::cout << "i is " << i << '\n';
        ++i;   // without this, i stays 1 and the loop never ends
    }
    std::cout << "done\n";
}
```

```output
i is 1
i is 2
i is 3
done
```

## The idiom: `while (std::cin >> x)`

Put the read **inside the condition**. Each time around, the loop tries to read a value; if that
works, the body runs with the new value; if it fails (EOF or bad input), the loop ends:

```cpp run
#include <iostream>

int main() {
    int x = 0;
    int sum = 0;
    int count = 0;
    while (std::cin >> x) {
        sum += x;
        ++count;
    }
    std::cout << "read " << count << " numbers, sum = " << sum << '\n';
}
```

With the input below (numbers can be spread over any number of lines):

```
10 20
30
40
```

it prints:

```output
read 4 numbers, sum = 100
```

With an empty stdin box it prints `read 0 numbers, sum = 0`: the very first read fails, so the body
never runs. This is the single most useful input pattern in C++. Learn it by heart:

```cpp
while (std::cin >> x) { /* use x */ }
```

It works for any type `>>` can read, and for several values at once:

```cpp
std::string word;
while (std::cin >> word) { /* one word at a time */ }

std::string name;
int score = 0;
while (std::cin >> name >> score) { /* one (name, score) pair at a time */ }
```

The pair version stops as soon as *either* read fails, so a trailing name without a score is not
processed.

### Did it stop at EOF or at bad input?

The loop ends on **any** failure. Afterwards you can ask why:

```cpp run
#include <iostream>

int main() {
    int x = 0, sum = 0;
    while (std::cin >> x) {
        sum += x;
    }
    if (std::cin.eof()) {
        std::cout << "reached the end of input\n";
    } else {
        std::cout << "stopped at something that is not a number\n";
    }
    std::cout << "sum = " << sum << '\n';
}
```

With input `1 2 3` it reports reaching the end; with `1 2 oops 3` it reports bad input and the sum is
`3` (the `3` after `oops` is never read).

## Reading line by line: `while (std::getline(std::cin, line))`

The same idea works with `getline`. It fails only when there are no more lines at all, so empty lines
in the middle are still read (as empty strings):

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string line;
    int number = 0;
    while (std::getline(std::cin, line)) {
        ++number;
        std::cout << number << ": " << line << '\n';
    }
    std::cout << "(" << number << " lines)\n";
}
```

With this input (note the empty second line):

```
first line

third line
```

it prints:

```output
1: first line
2: 
3: third line
(3 lines)
```

## Reading character by character

`while (std::cin.get(c))` visits **every** character, whitespace and newlines included:

```cpp run
#include <iostream>

int main() {
    char c = ' ';
    int chars = 0, spaces = 0, newlines = 0;
    while (std::cin.get(c)) {
        ++chars;
        if (c == ' ') {
            ++spaces;
        }
        if (c == '\n') {
            ++newlines;
        }
    }
    std::cout << chars << " chars, " << spaces << " spaces, " << newlines << " newlines\n";
}
```

With the input `a b c` followed by a newline, it prints `6 chars, 2 spaces, 1 newlines`.

## Reading N, then N values

A very common input format puts the **count first**:

```
4
3 1 4 1
```

Here you don't need EOF at all. Read `n`, then loop exactly `n` times:

```cpp run
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;

    int sum = 0;
    int i = 0;
    while (i < n) {
        int x = 0;
        std::cin >> x;
        sum += x;
        ++i;
    }
    std::cout << "sum of " << n << " values = " << sum << '\n';
}
```

With the input above it prints:

```output
sum of 4 values = 9
```

Anything after the `n`th value is simply never read. (The Control Flow module will show you the
`for` loop, which is the more natural way to write "do this `n` times".)

## The `while (!std::cin.eof())` bug

This looks reasonable, and it's wrong:

```cpp
int x = 0, sum = 0;
while (!std::cin.eof()) {   // WRONG
    std::cin >> x;
    sum += x;
}
```

With the input `1 2 3` followed by a newline, it prints a sum of **9**, not 6. Why?

- `eof()` only becomes true **after** a read has tried to go past the end. It doesn't predict the future.
- After reading `3`, the newline is still unread, so `eof()` is false and the loop runs once more.
- That extra read finds nothing, fails, and leaves `x` unchanged at `3`, which is then added again.

Worse, if the input contains something that isn't a number, the stream fails *without* reaching EOF,
`eof()` stays false forever, and the loop never ends.

> **Pitfall:** Never loop on `!std::cin.eof()` (or on `std::cin.good()`). Always make the **read itself**
> the loop condition: `while (std::cin >> x)` or `while (std::getline(std::cin, line))`. Then you only
> ever use a value that was actually read.

:::quiz
The input is `5 7 x 9`. What does this print?

```cpp
int x = 0, count = 0;
while (std::cin >> x) {
    ++count;
}
std::cout << count;
```

- [ ] `4`
- [ ] `3`
- [x] `2`
- [ ] It loops forever

`5` and `7` are read. Reading `x` as an `int` fails, which ends the loop. `9` is never reached.
:::

:::quiz
Why is `while (!std::cin.eof()) { std::cin >> x; ... }` wrong? (select all that apply)

- [x] `eof()` only becomes true after a read has already failed, so the body runs once with a failed read
- [x] On non-numeric input the stream fails without reaching EOF, so the loop never ends
- [ ] `eof()` doesn't compile with `std::cin`
- [ ] It skips the first value

Make the read the condition instead: `while (std::cin >> x)`.
:::

:::exercise Sum everything {easy}
Read integers until the end of input and print their sum.

**Input:** zero or more integers, separated by any whitespace (spaces and/or newlines).
**Output:** `Sum: S`. With no numbers at all, the sum is `0`.

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    int sum = 0;
    std::cin >> x;
    sum += x;
    std::cout << "Sum: " << sum << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    int sum = 0;
    while (std::cin >> x) {
        sum += x;
    }
    std::cout << "Sum: " << sum << '\n';
}
```

```hint
Use the read as the loop condition: `while (std::cin >> x) { ... }`.
```

```stdin
1 2 3 4
```

```expected
Sum: 10
```

```stdin
100
-50
7 8
```

```expected
Sum: 65
```

```stdin
```

```expected hidden
Sum: 0
```

```stdin
-5
```

```expected hidden
Sum: -5
```

```stdin
  

 7 


```

```expected hidden
Sum: 7
```

```checks
must while\s*\(\s*(std::)?cin\s*>> :: Use the idiom while (std::cin >> x).
```
:::

:::exercise Count and average {medium}
Read numbers (they may have decimals) until the end of input. Print how many there were and their
average.

**Input:** zero or more numbers.
**Output:** two lines,

```
Count: <how many>
Average: <average>
```

Print the average as a `double` with plain `<<`. If there were no numbers at all, print only the single
line `No numbers`.

```cpp starter
#include <iostream>

int main() {
    double x = 0.0;
    double sum = 0.0;
    int count = 0;

    // read all the numbers

    std::cout << "Count: " << count << '\n';
    std::cout << "Average: " << sum / count << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    double x = 0.0;
    double sum = 0.0;
    int count = 0;

    while (std::cin >> x) {
        sum += x;
        ++count;
    }

    if (count == 0) {
        std::cout << "No numbers\n";
    } else {
        std::cout << "Count: " << count << '\n';
        std::cout << "Average: " << sum / count << '\n';
    }
}
```

```hint
Count inside the loop with `++count;` and add each value to `sum`.
```

```hint
After the loop, use `if (count == 0) { ... } else { ... }` so you never divide by zero.
```

```stdin
2 4 9
```

```expected
Count: 3
Average: 5
```

```stdin
1.5 2
```

```expected
Count: 2
Average: 1.75
```

```stdin
```

```expected hidden
No numbers
```

```stdin
-1.5 -2.5
```

```expected hidden
Count: 2
Average: -2
```

```stdin
0
```

```expected hidden
Count: 1
Average: 0
```

```stdin
7
```

```expected hidden
Count: 1
Average: 7
```

```checks
must while\s*\( :: Use a while loop to read until the end of input.
```
:::

:::exercise Number the lines {easy}
Read every line of the input and print it with its line number in front. Empty lines count too.

**Input:** any number of lines.
**Output:** each line as `<number>: <line>`, numbered from 1.

For the input

```
first

third
```

the output is

```
1: first
2: 
3: third
```

(Line 2 is `2: ` with nothing after the space.)

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    int number = 0;
    while (std::cin >> word) {
        ++number;
        std::cout << number << ": " << word << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    int number = 0;
    while (std::getline(std::cin, line)) {
        ++number;
        std::cout << number << ": " << line << '\n';
    }
}
```

```hint
`>>` reads words and skips empty lines. Loop on `std::getline(std::cin, line)` instead.
```

```stdin
first

third
```

```expected
1: first
2: 
3: third
```

```stdin
  indented line
last line with   spaces
```

```expected hidden
1:   indented line
2: last line with   spaces
```

```stdin
only one line
```

```expected hidden
1: only one line
```

```stdin


third
```

```expected hidden
1:
2:
3: third
```

```checks
must while\s*\(\s*(std::)?getline :: Loop with while (std::getline(std::cin, line)).
```
:::

:::exercise N then N values {easy}
The first number in the input is a count `n`. Then come `n` integers. Print their total. Any input after
those `n` integers must be ignored.

**Input:** `n` (0 or more), followed by at least `n` integers.
**Output:** `Total of n numbers: S`

For input `3 10 20 30 999` the output is `Total of 3 numbers: 60` (the `999` is not part of the data).

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;

    int total = 0;
    int x = 0;
    while (std::cin >> x) {
        total += x;
    }
    std::cout << "Total of " << n << " numbers: " << total << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;

    int total = 0;
    int i = 0;
    while (i < n) {
        int x = 0;
        std::cin >> x;
        total += x;
        ++i;
    }
    std::cout << "Total of " << n << " numbers: " << total << '\n';
}
```

```hint
Use a counter: start `int i = 0;`, loop `while (i < n)`, and do `++i;` at the end of the body.
```

```stdin
3 10 20 30 999
```

```expected
Total of 3 numbers: 60
```

```stdin
5
1 1
1 1 1
```

```expected
Total of 5 numbers: 5
```

```stdin
0 42
```

```expected hidden
Total of 0 numbers: 0
```

```stdin
1
-7
8
```

```expected hidden
Total of 1 numbers: -7
```

```stdin
4 -1 -2 -3 -4 100
```

```expected hidden
Total of 4 numbers: -10
```

```checks
must while\s*\( :: Use a while loop.
```
:::

:::exercise Min, max and why it stopped {hard}
Read integers until the input ends **or** something that isn't an integer shows up. Then report how many
numbers were read, the smallest and largest of them, and why reading stopped.

**Input:** zero or more integers, possibly followed by junk.
**Output:**

```
Count: <how many>
Min: <smallest>
Max: <largest>
Ended: <end of input | bad input>
```

If no number was read at all, leave out the `Min` and `Max` lines.

For `4 4 x 100` the output is:

```
Count: 2
Min: 4
Max: 4
Ended: bad input
```

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    while (std::cin >> x) {
        ++count;
    }
    std::cout << "Count: " << count << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    int min = 0;
    int max = 0;
    while (std::cin >> x) {
        if (count == 0 || x < min) {
            min = x;
        }
        if (count == 0 || x > max) {
            max = x;
        }
        ++count;
    }

    std::cout << "Count: " << count << '\n';
    if (count > 0) {
        std::cout << "Min: " << min << '\n';
        std::cout << "Max: " << max << '\n';
    }
    if (std::cin.eof()) {
        std::cout << "Ended: end of input\n";
    } else {
        std::cout << "Ended: bad input\n";
    }
}
```

```hint
Don't start `max` at `0`: if every number is negative, `0` would wrongly win. Use the **first** number
read as the starting value for both (`count == 0` tells you it's the first).
```

```hint
After the loop, `std::cin.eof()` is true if the loop stopped because the input ran out, and false if it
stopped on something that isn't a number.
```

```stdin
3 -7 12
```

```expected
Count: 3
Min: -7
Max: 12
Ended: end of input
```

```stdin
4 4 x 100
```

```expected
Count: 2
Min: 4
Max: 4
Ended: bad input
```

```stdin
-5 -2 -9
```

```expected hidden
Count: 3
Min: -9
Max: -2
Ended: end of input
```

```stdin
```

```expected hidden
Count: 0
Ended: end of input
```

```stdin
abc 1 2
```

```expected hidden
Count: 0
Ended: bad input
```

```stdin
2147483647
-2147483648
```

```expected hidden
Count: 2
Min: -2147483648
Max: 2147483647
Ended: end of input
```

```stdin
7 8.5 9
```

```expected hidden
Count: 2
Min: 7
Max: 8
Ended: bad input
```

```checks
must while\s*\(\s*(std::)?cin\s*>> :: Read with while (std::cin >> x).
must \.eof\s*\( :: Use std::cin.eof() to find out why the loop stopped.
```
:::
