---
title: The Stream Model
summary: How std::cin, files, and strings all share one design, the iostream class hierarchy, writing functions that work with any stream, and buffering.
---

## One idea, many places

You've used `std::cin >> x` and `std::cout << x` since your first program. The big secret of C++ I/O
is that **the same operators work everywhere**: on the console, on files, and on strings in memory.
That's because they're all **streams**.

A **stream** is a sequence of characters that flows in one direction:

- An **input stream** is a **source**: you pull characters *out* of it with `>>`, `getline`, `get`, ...
- An **output stream** is a **sink**: you push characters *into* it with `<<`, `put`, `write`, ...

Where the characters actually come from or go to (keyboard, terminal, a file on disk, a
`std::string`) is a detail hidden behind the stream. Your code just reads and writes.

```
   keyboard ─┐                               ┌─► terminal
   file     ─┼─► [ input stream ] ─► program ─► [ output stream ] ─┼─► file
   string   ─┘        >>  getline              <<  put             └─► string
```

## The class hierarchy

The standard library builds every stream type from a small family of classes. Here are the ones
you'll actually use (each is really an alias for a `basic_...<char>` template, which is why error
messages sometimes say `std::basic_ostream<char>`):

```
std::ios_base                       formatting flags, open modes
└── std::ios                        stream state (good / fail / eof / bad)
    ├── std::istream                input:  >>  getline  get
    │   ├── std::ifstream           ...from a file
    │   ├── std::istringstream      ...from a string
    │   └── std::iostream           input AND output (derives from both istream and ostream)
    │       ├── std::fstream        ...a file, both ways
    │       └── std::stringstream   ...a string, both ways
    └── std::ostream                output: <<  put  write
        ├── std::ofstream           ...to a file
        ├── std::ostringstream      ...to a string
        └── std::iostream           (the same class as above: multiple inheritance)
```

| Class | Direction | Connected to | Header |
| --- | --- | --- | --- |
| `std::istream` | input | anything (base class) | `<istream>` / `<iostream>` |
| `std::ostream` | output | anything (base class) | `<ostream>` / `<iostream>` |
| `std::iostream` | both | anything (base class) | `<iostream>` |
| `std::ifstream` | input | a file | `<fstream>` |
| `std::ofstream` | output | a file | `<fstream>` |
| `std::fstream` | both | a file | `<fstream>` |
| `std::istringstream` | input | a `std::string` | `<sstream>` |
| `std::ostringstream` | output | a `std::string` | `<sstream>` |
| `std::stringstream` | both | a `std::string` | `<sstream>` |

The four **standard stream objects** are created for you before `main` starts:

| Object | Type | Meaning | Buffered? |
| --- | --- | --- | --- |
| `std::cin` | `std::istream` | standard input | yes |
| `std::cout` | `std::ostream` | standard output | yes |
| `std::cerr` | `std::ostream` | standard error (for error messages) | no, written immediately |
| `std::clog` | `std::ostream` | standard error (for logging) | yes |

> **Note:** The exercise checker only compares **standard output** (`std::cout`). Anything you write to
> `std::cerr` or `std::clog` shows up in the IDE but is not graded, which makes `std::cerr` a handy place
> for debug prints.

## Inheritance pays off: write once, use with any stream

Because `std::ofstream` and `std::ostringstream` both **derive from** `std::ostream`, a function that
takes a `std::ostream&` accepts `std::cout`, a file, *or* a string stream. The same goes for
`std::istream&` on the input side. This is the single most useful thing to know about streams.

```cpp run
#include <iostream>
#include <sstream>
#include <string>

// Works with ANY output stream: console, file, or string.
void printReceipt(std::ostream& out, const std::string& item, int cents) {
    out << item << ": $" << cents / 100 << '.' << (cents % 100 < 10 ? "0" : "") << cents % 100 << '\n';
}

// Works with ANY input stream.
int sumAll(std::istream& in) {
    int total = 0;
    int x;
    while (in >> x) {
        total += x;
    }
    return total;
}

int main() {
    printReceipt(std::cout, "coffee", 350);     // to the console

    std::ostringstream buffer;                  // to a string in memory
    printReceipt(buffer, "bagel", 205);
    std::string text = buffer.str();
    std::cout << "captured " << text.size() << " chars: " << text;

    std::istringstream numbers("10 20 30 40");  // read from a string
    std::cout << "sum = " << sumAll(numbers) << '\n';
}
```

```output
coffee: $3.50
captured 13 chars: bagel: $2.05
sum = 100
```

In real programs this means you can test file-processing code by feeding it a string stream, and
switch logging from the console to a file by changing one argument.

## Streams can't be copied

A stream owns a connection to a resource (a file handle, a buffer), so copying one makes no sense.
Stream classes have their copy constructor **deleted**. Always pass streams **by reference**:

```cpp compile-error
#include <iostream>

void greet(std::ostream out) {     // by value: tries to copy the stream
    out << "hi\n";
}

int main() {
    greet(std::cout);   // error: use of deleted function 'std::basic_ostream<...>(const ...&)'
}
```

Streams *can* be **moved** (for example, returned from a function that opens a file), and they're
used as `std::ostream&` / `std::istream&` everywhere else.

## Why `<<` chains

`out << a << b` works because `operator<<` **returns the stream it was given**. The expression is
evaluated as `(out << a) << b`. The same is true for `>>`. That's also why `while (in >> x)` works: the
loop condition is the stream itself, converted to `bool` (you'll see exactly how in the stream-state
lesson).

Your own types can join in by overloading the operators (you did this in the classes module):

```cpp run
#include <iostream>
#include <sstream>

struct Point {
    int x;
    int y;
};

std::ostream& operator<<(std::ostream& out, const Point& p) {
    return out << '(' << p.x << ", " << p.y << ')';
}

std::istream& operator>>(std::istream& in, Point& p) {
    return in >> p.x >> p.y;
}

int main() {
    std::istringstream src("3 4  -1 7");
    Point a{};
    Point b{};
    src >> a >> b;
    std::cout << a << " and " << b << '\n';
}
```

```output
(3, 4) and (-1, 7)
```

Because they take and return `std::ostream&` / `std::istream&`, these operators automatically work with
files and string streams too.

## Character-level I/O: `get`, `put`, `peek`, `unget`

`>>` is **formatted** input: it skips whitespace and converts text into a value. Sometimes you need the
raw characters, whitespace included. These **unformatted** member functions do that:

| Call | What it does |
| --- | --- |
| `in.get(c)` | reads one character (any character, including spaces and `'\n'`) into `c`; returns the stream |
| `in.get()` | reads one character and returns it as an `int` (or `EOF` at the end) |
| `in.peek()` | returns the next character **without** removing it |
| `in.unget()` | puts the last character back |
| `out.put(c)` | writes one character |

```cpp run
#include <cctype>
#include <iostream>
#include <sstream>

int main() {
    std::istringstream in("a b\nc");

    char c;
    int spaces = 0;
    int newlines = 0;
    while (in.get(c)) {              // stops when no character is left
        if (c == ' ') ++spaces;
        if (c == '\n') ++newlines;
        std::cout.put(c == '\n' ? '|' : c);
    }
    std::cout << "\nspaces=" << spaces << " newlines=" << newlines << '\n';

    std::istringstream digits("42abc");
    if (std::isdigit(digits.peek())) {    // look, don't take
        int n;
        digits >> n;
        std::cout << "number first: " << n << ", next char: " << static_cast<char>(digits.peek()) << '\n';
    }
}
```

```output
a b|c
spaces=1 newlines=1
number first: 42, next char: a
```

Compare that with `in >> c`, which would skip the space and newline completely.

## Buffering

Writing to a terminal or a disk is slow compared to writing to memory. So output streams collect
characters in a **buffer** (a block of memory) and send them to the real destination in big chunks.
Sending the buffer is called **flushing**. A buffer is flushed when:

- it fills up,
- you write `std::endl` (newline **plus** flush) or `std::flush` (flush only), or call `out.flush()`,
- the stream is destroyed or closed (for example, at the end of the program or the end of a file stream's scope),
- you read from `std::cin` (because `std::cin` is **tied** to `std::cout`; see below).

```cpp run
#include <iostream>

int main() {
    std::cout << "buffered... ";
    std::cout << std::flush;          // force it out now, no newline
    std::cout << "line one" << std::endl;   // newline + flush
    std::cout << "line two\n";        // newline, no flush (faster)
    std::cout.flush();                // member-function form
}
```

```output
buffered... line one
line two
```

Why it matters:

- **Performance.** `std::endl` in a loop that prints a million lines forces a million slow flushes.
  Use `'\n'` and let the buffer do its job.
- **Crashes lose output.** If a program crashes, whatever is still in the buffer is never written. That's
  why `std::cerr` is unbuffered: error messages should appear even if the next line crashes.
- **Tied streams.** `std::cin.tie()` returns `&std::cout`, which means "flush `cout` before every read
  from `cin`". That's why a prompt like `std::cout << "Name: ";` appears before the program waits for
  input, even without a newline.

You'll often see this line at the top of competitive-programming solutions:

```cpp
std::ios::sync_with_stdio(false);   // don't keep iostreams in sync with C's printf/scanf
std::cin.tie(nullptr);              // don't flush cout before each cin read
```

It makes heavy console I/O much faster. The cost: you must not mix `printf` with `std::cout` afterwards,
and prompts are no longer flushed automatically.

:::quiz
Which parameter type lets a function write to `std::cout`, a file, **and** a string stream?

- [ ] `std::ofstream&`
- [x] `std::ostream&`
- [ ] `std::ostream`
- [ ] `std::ostringstream&`

`std::ofstream` and `std::ostringstream` both derive from `std::ostream`, and `std::cout` *is* a
`std::ostream`. A reference to the base class accepts all three. Passing by value doesn't compile
because streams can't be copied.
:::

:::quiz
What is the difference between `std::cout << '\n'` and `std::cout << std::endl`?

- [ ] There is none
- [x] `std::endl` also flushes the output buffer
- [ ] `'\n'` doesn't work on Windows
- [ ] `std::endl` prints two newlines

Both end the line. `std::endl` additionally flushes, which is slower if done often.
:::

:::quiz
Given `std::istringstream in("x y");`, what does this loop print?

```cpp
char c;
while (in >> c) std::cout << '[' << c << ']';
```

- [x] `[x][y]`
- [ ] `[x][ ][y]`
- [ ] `[x y]`
- [ ] Nothing

Formatted input with `>>` skips whitespace, so the space is never read into `c`. Use `in.get(c)` to see it.
:::

:::exercise Count characters and lines {easy}
Read **all** of standard input character by character using `std::cin.get(c)` and print how many
characters there were in total (including spaces and newlines) and how many of them were newlines.

**Output:** exactly two lines:

```
chars: <total>
lines: <number of '\n' characters>
```

For input `hi there` followed by a newline, that's `chars: 9` and `lines: 1`.

```cpp starter
#include <iostream>

int main() {
    int chars = 0;
    int lines = 0;
    // read every character with std::cin.get(c)

    std::cout << "chars: " << chars << '\n';
    std::cout << "lines: " << lines << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int chars = 0;
    int lines = 0;
    char c;
    while (std::cin.get(c)) {
        ++chars;
        if (c == '\n') {
            ++lines;
        }
    }
    std::cout << "chars: " << chars << '\n';
    std::cout << "lines: " << lines << '\n';
}
```

```hint
`while (std::cin.get(c)) { ... }` runs once per character and stops at the end of the input.
```

```stdin
hi there

```

```expected
chars: 9
lines: 1
```

```stdin
a  b
c


```

```expected hidden
chars: 8
lines: 3
```

```stdin
	 tab
```

```expected hidden
chars: 5
lines: 0
```

```expected
chars: 0
lines: 0
```

```checks
must \.get\s*\( :: Read characters with std::cin.get(c).
```
:::

:::exercise One printer, any stream {easy}
Write a function `void printSquares(std::ostream& out, int n)` that writes the lines `1^2 = 1`,
`2^2 = 4`, ... up to `n^2 = ...` (one per line) to `out`.

In `main`, read `n`, call `printSquares` with a `std::ostringstream`, then print the captured text
followed by one more line `captured <k> characters`, where `k` is the length of the captured string.

For `n = 2` the output is:

```
1^2 = 1
2^2 = 4
captured 16 characters
```

If `n` is 0 or negative, nothing is captured: print just `captured 0 characters`.

```cpp starter
#include <iostream>
#include <sstream>

void printSquares(std::ostream& out, int n) {
    // write the lines to out
}

int main() {
    int n;
    std::cin >> n;
    // capture printSquares's output in a std::ostringstream, then print it and its length
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

void printSquares(std::ostream& out, int n) {
    for (int i = 1; i <= n; ++i) {
        out << i << "^2 = " << i * i << '\n';
    }
}

int main() {
    int n;
    std::cin >> n;
    std::ostringstream buffer;
    printSquares(buffer, n);
    std::string text = buffer.str();
    std::cout << text;
    std::cout << "captured " << text.size() << " characters\n";
}
```

```hint
`std::ostringstream buffer; printSquares(buffer, n);` then `buffer.str()` gives you the text as a `std::string`.
```

```stdin
2
```

```expected
1^2 = 1
2^2 = 4
captured 16 characters
```

```stdin
4
```

```expected hidden
1^2 = 1
2^2 = 4
3^2 = 9
4^2 = 16
captured 33 characters
```

```stdin
0
```

```expected
captured 0 characters
```

```stdin
-3
```

```expected hidden
captured 0 characters
```

```stdin
10
```

```expected hidden
1^2 = 1
2^2 = 4
3^2 = 9
4^2 = 16
5^2 = 25
6^2 = 36
7^2 = 49
8^2 = 64
9^2 = 81
10^2 = 100
captured 89 characters
```

```checks
must std::ostream\s*& :: printSquares should take a std::ostream& parameter.
must ostringstream :: Capture the output in a std::ostringstream.
```
:::

:::exercise Sum from any source {medium}
Write `long long sumStream(std::istream& in)` that reads integers from `in` until it can't read any
more and returns their sum.

Then in `main`:

1. Read the **first line** of input with `std::getline`, wrap it in a `std::istringstream`, and sum it with `sumStream`.
2. Sum **the rest** of standard input by calling `sumStream(std::cin)`.

**Output:** two lines, `first line: <sum>` and `rest: <sum>`. An empty line or no remaining input sums to `0`.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>

long long sumStream(std::istream& in) {
    return 0;
}

int main() {
    std::string first;
    std::getline(std::cin, first);
    // ...
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

long long sumStream(std::istream& in) {
    long long total = 0;
    long long x;
    while (in >> x) {
        total += x;
    }
    return total;
}

int main() {
    std::string first;
    std::getline(std::cin, first);
    std::istringstream line(first);
    std::cout << "first line: " << sumStream(line) << '\n';
    std::cout << "rest: " << sumStream(std::cin) << '\n';
}
```

```hint
`std::istringstream line(first);` makes a stream that reads from the string. Pass it to `sumStream`
just like you pass `std::cin`.
```

```stdin
1 2 3
10
20 30
```

```expected
first line: 6
rest: 60
```

```stdin

5 -5 7
```

```expected hidden
first line: 0
rest: 7
```

```stdin
-1 -2 x 5
3
4 y 5
```

```expected hidden
first line: -3
rest: 7
```

```stdin
4000000000 4000000000
```

```expected
first line: 8000000000
rest: 0
```

```checks
must std::istream\s*& :: sumStream should take a std::istream& parameter.
must istringstream :: Wrap the first line in a std::istringstream.
```
:::

:::exercise Comment stripper {hard}
Write a tool that removes the comments from C++ source code, reading standard input **character by
character** with `get` and looking ahead with `peek`.

Rules:

- `//` starts a **line comment**: drop everything up to, but not including, the next newline (the
  newline itself is kept).
- `/*` starts a **block comment** that ends at the next `*/`. Replace the whole comment with a single
  space. (So `/*/ x */` is one complete comment, and `/**/` is an empty one.)
- Inside a string literal `"..."` or a character literal `'...'`, nothing is a comment: copy the literal
  unchanged up to its closing quote. A backslash inside a literal makes the **next** character part of
  the literal too, so `"say \"hi\" // not a comment"` and `'\''` are each one literal.
- Everything else is copied unchanged, including a `/` that doesn't start a comment (like `a / b`).
- If the input ends inside a block comment, print what you have so far, then the line
  `error: unterminated comment` (on a new line if the text so far doesn't end with a newline).

For example:

```
int x = 5; // the answer
/* a block
   comment */int y = x / 2;
std::string s = "not // a comment";
```

becomes

```
int x = 5; 
 int y = x / 2;
std::string s = "not // a comment";
```

(The checker ignores spaces at the end of a line, so the space left after `5;` doesn't matter.)

```cpp starter
#include <iostream>

int main() {
    char c;
    while (std::cin.get(c)) {
        std::cout.put(c);   // TODO: drop the comments
    }
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr auto eof = std::istream::traits_type::eof();
    bool endsWithNewline = true;   // does the output so far end with '\n' (or is it empty)?
    auto put = [&endsWithNewline](char ch) {
        std::cout.put(ch);
        endsWithNewline = ch == '\n';
    };

    char c;
    while (std::cin.get(c)) {
        if (c == '/' && std::cin.peek() == '/') {
            while (std::cin.peek() != eof && std::cin.peek() != '\n') std::cin.get();   // keep the '\n'
        } else if (c == '/' && std::cin.peek() == '*') {
            std::cin.get();   // the '*' of "/*": it can't also be the '*' of "*/"
            bool closed = false;
            char d;
            while (std::cin.get(d)) {
                if (d == '*' && std::cin.peek() == '/') {
                    std::cin.get();
                    closed = true;
                    break;
                }
            }
            if (!closed) {
                if (!endsWithNewline) std::cout << '\n';
                std::cout << "error: unterminated comment\n";
                return 0;
            }
            put(' ');
        } else if (c == '"' || c == '\'') {
            const char quote = c;
            put(c);
            char d;
            while (std::cin.get(d)) {
                put(d);
                if (d == '\\') {
                    if (std::cin.get(d)) put(d);   // escaped character: copy it, whatever it is
                } else if (d == quote) {
                    break;
                }
            }
        } else {
            put(c);
        }
    }
}
```

```hint
`std::cin.peek()` returns the next character **without** consuming it (as an `int`, or `EOF` at the
end). After reading a `/`, peek: another `/` or a `*` means a comment starts; anything else means the
`/` was just a division.
```

```hint
Handle literals as their own little loop: once you've copied an opening quote, copy characters until the
matching quote. When you meet a backslash, copy it **and** the character after it without looking at
that character, so `\"` can't end the string.
```

```hint
After `/*`, the `*` is already consumed, so `/*/` doesn't close the comment: you need a `*` that is
followed by `/`.
```

```stdin
int x = 5; // the answer
/* a block
   comment */int y = x / 2;
std::string s = "not // a comment";
```

```expected
int x = 5;
 int y = x / 2;
std::string s = "not // a comment";
```

```stdin
a = 1; /* oops
b = 2;
```

```expected
a = 1;
error: unterminated comment
```

```stdin
char q = '\''; // quote
puts("\"/*\" \\"); /**/x
/*/ still a comment */y = a / b / c;
z = a//b
*/ stays
c = '/'; d = '"'; // "
e = "\\\\"; /* tail */
f = 1 / 2 /
```

```expected hidden
char q = '\'';
puts("\"/*\" \\");  x
 y = a / b / c;
z = a
*/ stays
c = '/'; d = '"';
e = "\\\\";
f = 1 / 2 /
```

```stdin
// only a comment
/* multi
line */
"unterminated string /* not a comment
```

```expected hidden


"unterminated string /* not a comment
```

```stdin
x /*
```

```expected hidden
x
error: unterminated comment
```

```checks
must \.get\s*\( :: Read character by character with get.
must \.peek\s*\( :: Look ahead with peek.
```
:::

