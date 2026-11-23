---
title: Reading Lines and Characters
summary: std::getline for whole lines, the classic leftover-newline bug when mixing >> and getline, how std::ws and ignore() fix it, and reading single characters with cin.get().
---

`std::cin >> s` reads one **word**. Often you want a whole line, spaces and all: a full name, a
sentence, an address. That's what `std::getline` is for.

## `std::getline`

```cpp
std::getline(stream, string_variable);
```

`std::getline` (from `<string>`) reads characters from the stream into a `std::string` **until it
reaches a newline**. The newline is removed from the input and thrown away; it is **not** stored
in the string.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::cout << "Enter your full name: ";
    std::getline(std::cin, line);
    std::cout << "Hello, " << line << "!\n";
}
```

With the input `Ada King Lovelace`:

```output
Enter your full name: Hello, Ada King Lovelace!
```

Compare with `>>`:

| | `std::cin >> s` | `std::getline(std::cin, s)` |
| --- | --- | --- |
| Skips leading whitespace | yes | **no**, leading spaces are kept |
| Stops at | any whitespace | the newline only |
| The terminating character | stays in the input | is removed and discarded |
| Empty line | skipped (keeps looking for a word) | gives an empty string `""` |

`std::getline` returns the stream, just like `>>`, so you can check whether it worked. It fails only
when there's nothing left to read at all (end of input):

```cpp
std::string line;
if (std::getline(std::cin, line)) {
    std::cout << "read: " << line << '\n';
} else {
    std::cout << "no more input\n";
}
```

### A different delimiter

An optional third argument changes the character that ends the read. This reads up to a comma:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string first, second;
    std::getline(std::cin, first, ',');    // stops at ',' (and discards it)
    std::getline(std::cin, second);        // the rest of the line
    std::cout << "[" << first << "] [" << second << "]\n";
}
```

With the input `apples,oranges and pears`:

```output
[apples] [oranges and pears]
```

## The classic bug: `>>` followed by `getline`

This is one of the most common beginner bugs in C++. The program reads a number, then a line:

```cpp run
#include <iostream>
#include <string>

int main() {
    int age = 0;
    std::string name;

    std::cout << "Age: ";
    std::cin >> age;
    std::cout << "Full name: ";
    std::getline(std::cin, name);

    std::cout << "[" << name << "] is " << age << '\n';
}
```

You type this input:

```
30
Ada Lovelace
```

and the program prints:

```output
Age: Full name: [] is 30
```

The name is **empty**! What happened? Look at the input as the sequence of characters it really is:

```
3  0  \n  A  d  a     L  o  v  e  l  a  c  e  \n
```

1. `std::cin >> age` reads `3` and `0`, and **stops at the `\n`**, leaving it in the input.
2. `std::getline` reads "up to the next newline". The very next character *is* a newline, so it reads
   an empty line, discards the `\n`, and returns `""`.

`Ada Lovelace` is still sitting there unread. The fix is to get rid of the leftover newline before
calling `getline`. There are two standard ways.

### Fix 1: `std::ws`

`std::ws` is an input manipulator that **skips all whitespace** (spaces, tabs, newlines) at the current
position. Use it right before `getline`:

```cpp
std::cin >> age;
std::getline(std::cin >> std::ws, name);   // skip the leftover newline, then read the line
```

`std::cin >> std::ws` returns `std::cin`, so it can be passed straight to `getline`. You can also write
it as two statements:

```cpp
std::cin >> std::ws;
std::getline(std::cin, name);
```

### Fix 2: `ignore()` the rest of the line

```cpp
std::cin >> age;
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');   // needs <limits>
std::getline(std::cin, name);
```

This discards everything up to and including the newline after the number.

Here's the fixed program, using `std::ws`:

```cpp run
#include <iostream>
#include <string>

int main() {
    int age = 0;
    std::string name;

    std::cin >> age;
    std::getline(std::cin >> std::ws, name);

    std::cout << "[" << name << "] is " << age << '\n';
}
```

With the same input it prints:

```output
[Ada Lovelace] is 30
```

### Which fix to choose?

| | `std::ws` | `ignore(max, '\n')` |
| --- | --- | --- |
| Leftover newline | skipped | skipped |
| Extra text after the number (`30 years`) | `years` becomes the line you read | discarded |
| Blank lines before the text | skipped | the first blank line is read as `""` |
| Leading spaces on the next line | removed | kept |

`std::ws` is shorter and usually what you want. Use `ignore` when the rest of the line after the
number should be thrown away, or when blank lines and leading spaces matter.

> **Note:** The bug only happens when going from `>>` **to** `getline`. Going from `getline` to `>>` is
> fine, because `getline` consumes its newline and `>>` skips whitespace anyway.

## Reading single characters

`std::cin >> c` (with `char c`) reads one character but **skips whitespace first**, so you can never
read a space or a newline with it. When every character matters, use `get`:

| Code | What it does |
| --- | --- |
| `std::cin >> c` | skip whitespace, then read one character |
| `std::cin.get(c)` | read the very next character, whatever it is (space, `'\n'`, ...) into `c` |
| `int ch = std::cin.get();` | same, but **returns** it as an `int`; returns `EOF` (usually `-1`) at the end of input |
| `std::cin.peek()` | look at the next character **without** removing it |
| `std::cin >> std::noskipws >> c` | make `>>` stop skipping whitespace (sticky until `std::skipws`) |

```cpp run
#include <iostream>

int main() {
    char a = '?', b = '?', c = '?';
    std::cin.get(a);
    std::cin.get(b);
    std::cin.get(c);
    std::cout << "[" << a << "][" << b << "][" << c << "]\n";
}
```

With the input `x y` (x, space, y):

```output
[x][ ][y]
```

With `std::cin >> a >> b >> c` instead, you'd get `x` and `y` and then a failed read, since the
space is skipped.

Like `>>`, `std::cin.get(c)` returns the stream, so `if (std::cin.get(c))` checks that a character was
actually read.

> **Pitfall:** `int ch = std::cin.get();` returns an `int`, not a `char`, because it needs one extra
> value, `EOF`, that isn't any character. Store it in an `int` and compare against `EOF` before
> converting it to `char`.

`peek` is handy for deciding what to do before reading:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::cin >> std::ws;                  // skip leading whitespace
    int next = std::cin.peek();           // look, don't take
    if (next >= '0' && next <= '9') {
        int n = 0;
        std::cin >> n;
        std::cout << "a number: " << n << '\n';
    } else {
        std::string word;
        std::cin >> word;
        std::cout << "a word: " << word << '\n';
    }
}
```

With input `42` it prints `a number: 42`; with `hello` it prints `a word: hello`. (With an empty stdin
box, it prints `a word: ` followed by nothing.)

:::quiz
The input is the two lines `5` and `hello world`. What does `line` contain after this code?

```cpp
int n = 0;
std::string line;
std::cin >> n;
std::getline(std::cin, line);
```

- [ ] `"hello world"`
- [ ] `"hello"`
- [x] `""` (an empty string)
- [ ] `"5"`

`>>` leaves the newline after `5` in the input, and `getline` immediately reads that empty line.
Use `std::getline(std::cin >> std::ws, line)` to skip it.
:::

:::quiz
The input is `  a b` (two spaces, `a`, space, `b`). What does `c` contain after `std::cin.get(c)`?

- [x] a space `' '`
- [ ] `'a'`
- [ ] `'b'`
- [ ] nothing; `get` fails on whitespace

`get` reads the very next character, whitespace included. `std::cin >> c` would have skipped the
spaces and read `'a'`.
:::

:::exercise Echo the line {easy}
Read one whole line and print it back inside double quotes, exactly as typed (including all spaces).

**Input:** one line of text.
**Output:** `You said: "<the line>"`

For input `Hello,   world!` the output is `You said: "Hello,   world!"`

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::cin >> line;
    std::cout << "You said: \"" << line << "\"\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << "You said: \"" << line << "\"\n";
}
```

```hint
`>>` stops at the first space. `std::getline(std::cin, line)` reads up to the end of the line.
```

```stdin
Hello,   world!
```

```expected
You said: "Hello,   world!"
```

```stdin
  two leading spaces
```

```expected hidden
You said: "  two leading spaces"
```

```stdin
tabs	and  spaces  
```

```expected hidden
You said: "tabs	and  spaces  "
```

```stdin
first line
second line
```

```expected hidden
You said: "first line"
```

```checks
must getline :: Read the line with std::getline.
```
:::

:::exercise Age then name {easy}
The starter has the classic `>>`-then-`getline` bug. Fix it.

**Input:** an age on the first line, and a full name (may contain spaces) on the second line.
**Output:** `<name> is <age>.`

For the input

```
30
Ada Lovelace
```

the output is `Ada Lovelace is 30.`

```cpp starter
#include <iostream>
#include <string>

int main() {
    int age = 0;
    std::string name;
    std::cin >> age;
    std::getline(std::cin, name);
    std::cout << name << " is " << age << ".\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    int age = 0;
    std::string name;
    std::cin >> age;
    std::getline(std::cin >> std::ws, name);
    std::cout << name << " is " << age << ".\n";
}
```

```hint
After `std::cin >> age`, the newline at the end of the first line is still in the input.
```

```hint
`std::getline(std::cin >> std::ws, name)` skips it. `std::cin.ignore(...)` works too.
```

```stdin
30
Ada Lovelace
```

```expected
Ada Lovelace is 30.
```

```stdin
42   
Alan Mathison Turing
```

```expected hidden
Alan Mathison Turing is 42.
```

```stdin
0
X
```

```expected hidden
X is 0.
```

```checks
must getline :: Keep using std::getline for the name.
```
:::

:::exercise Three characters {easy}
Read the first three characters of the input **exactly as they are**, including spaces, and print
each one inside square brackets.

**Input:** a line with at least three characters, e.g. ` ab` (a space, then `a`, then `b`).
**Output:** the three characters in brackets, e.g. `[ ][a][b]`

```cpp starter
#include <iostream>

int main() {
    char a = '?', b = '?', c = '?';
    std::cin >> a >> b >> c;
    std::cout << '[' << a << "][" << b << "][" << c << "]\n";
}
```

```cpp solution
#include <iostream>

int main() {
    char a = '?', b = '?', c = '?';
    std::cin.get(a);
    std::cin.get(b);
    std::cin.get(c);
    std::cout << '[' << a << "][" << b << "][" << c << "]\n";
}
```

```hint
`>>` skips whitespace. `std::cin.get(ch)` reads the next character no matter what it is.
```

```stdin
 ab
```

```expected
[ ][a][b]
```

```stdin
xyz
```

```expected
[x][y][z]
```

```stdin
a b c
```

```expected hidden
[a][ ][b]
```

```stdin
	ab
```

```expected hidden
[	][a][b]
```

```checks
must \.get\s*\( :: Read the characters with std::cin.get().
```
:::

:::exercise Name card {medium}
Read a full name, an age, and a city, each on its own line, and print a small card. Both the name
and the city may contain spaces.

**Input:** three lines: full name, age (an integer), city.
**Output:** exactly three lines:

```
Name: <name>
Age: <age>
City: <city>
```

For the input

```
Grace Brewster Hopper
85
New York City
```

the output is:

```
Name: Grace Brewster Hopper
Age: 85
City: New York City
```

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string name, city;
    int age = 0;

    // read the three lines

    std::cout << "Name: " << name << '\n';
    std::cout << "Age: " << age << '\n';
    std::cout << "City: " << city << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string name, city;
    int age = 0;

    std::getline(std::cin, name);
    std::cin >> age;
    std::getline(std::cin >> std::ws, city);

    std::cout << "Name: " << name << '\n';
    std::cout << "Age: " << age << '\n';
    std::cout << "City: " << city << '\n';
}
```

```hint
Read the name with `getline`, the age with `>>`, and the city with `getline` again.
```

```hint
Going from `>>` back to `getline` leaves a newline behind. Skip it with `std::ws`.
```

```stdin
Grace Brewster Hopper
85
New York City
```

```expected
Name: Grace Brewster Hopper
Age: 85
City: New York City
```

```stdin
Linus
0
Helsinki
```

```expected hidden
Name: Linus
Age: 0
City: Helsinki
```

```stdin
  Ada  King
36
   London  Town
```

```expected hidden
Name:   Ada  King
Age: 36
City: London  Town
```

```stdin
X
7
Y
```

```expected hidden
Name: X
Age: 7
City: Y
```

```checks
must getline :: Use std::getline for the lines that may contain spaces.
```
:::

:::exercise CSV record {hard}
Parse one line of comma-separated data: `last,first,age,city`.

**Input:** one line with four fields separated by commas:

- After each comma there may be **any number of spaces** (including none). They are not part of the
  next field.
- `last`, `first` and `city` may contain spaces inside them (`van Rossum`, `New York City`).
- `age` is an integer.
- `city` is everything after the third comma, up to the end of the line. It may even contain more
  commas (`Belmont, California`).

**Output:** `<first> <last>, age <age>, lives in <city>`

| Input | Output |
| --- | --- |
| `Lovelace,Ada,36,London` | `Ada Lovelace, age 36, lives in London` |
| `van Rossum,  Guido, 68,   Belmont, California` | `Guido van Rossum, age 68, lives in Belmont, California` |

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string last, first, city;
    int age = 0;

    std::cout << first << ' ' << last << ", age " << age << ", lives in " << city << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string last, first, city;
    int age = 0;
    char comma = ' ';

    std::getline(std::cin, last, ',');
    std::getline(std::cin >> std::ws, first, ',');
    std::cin >> age >> comma;                 // >> skips the spaces before the age; then eat the ','
    std::getline(std::cin >> std::ws, city);  // the rest of the line, commas included

    std::cout << first << ' ' << last << ", age " << age << ", lives in " << city << '\n';
}
```

```hint
`std::getline(stream, s, ',')` reads up to the next comma and throws the comma away. Put `std::ws` in
front of it to skip the spaces that may follow the previous comma.
```

```hint
The age is a number, so read it with `>>`. That leaves the comma after it in the input: read it into a
`char` (or `ignore()` one character).
```

```hint
The city may contain commas, so don't stop at `','` for the last field. Read the rest of the line.
```

```stdin
Lovelace,Ada,36,London
```

```expected
Ada Lovelace, age 36, lives in London
```

```stdin
van Rossum,  Guido, 68,   Belmont, California
```

```expected
Guido van Rossum, age 68, lives in Belmont, California
```

```stdin
Hopper,Grace Brewster,  85,New York City
```

```expected hidden
Grace Brewster Hopper, age 85, lives in New York City
```

```stdin
X,Y,0,Z
```

```expected hidden
Y X, age 0, lives in Z
```

```stdin
Stroustrup,   Bjarne,   73,   College Station, Texas, USA
```

```expected hidden
Bjarne Stroustrup, age 73, lives in College Station, Texas, USA
```

```checks
must getline\s*\([^)]*',' :: Use std::getline with ',' as the delimiter.
```
:::
