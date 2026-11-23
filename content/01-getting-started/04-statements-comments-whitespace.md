---
title: Statements, Comments & Whitespace
summary: How C++ reads your code. Statements, blocks, both kinds of comments, and why indentation is for humans.
---

## Statements and blocks

A **statement** is one instruction. Most end with a semicolon `;`. A **block** (or *compound
statement*) is a group of statements in curly braces `{ }`, and can be used anywhere a single
statement can.

```cpp
std::cout << "a statement\n";        // expression statement
;                                     // empty statement (legal, does nothing)
{                                     // a block...
    std::cout << "inside a block\n";
}                                     // ...no semicolon needed after it
```

Statements execute **in order, top to bottom**, unless control flow (`if`, loops, function calls)
says otherwise. You'll learn those soon.

## Comments

Comments are notes for humans. The compiler throws them away during preprocessing.

```cpp run
#include <iostream>

// A single-line comment runs from // to the end of the line.

/* A multi-line (block) comment
   can span as many lines
   as you like. */

/**
 * Doc comments are just block comments with a style convention.
 * Tools like Doxygen read them to generate documentation.
 */
int main() {
    std::cout << "comments " /* even in the middle of a line */ << "are ignored\n";
    // std::cout << "this line is commented out, so it never runs\n";
}
```

```output
comments are ignored
```

Rules and tips:

- Block comments **do not nest**. `/* outer /* inner */ still outer? */` ends at the first `*/`,
  leaving `still outer? */` as broken code.
- "Commenting out" code (putting `//` before it) is a quick way to disable a line while debugging.
- Good comments explain **why**, not **what**. `i = i + 1; // add one to i` is noise;
  `// skip the header row` is useful.

```cpp compile-error
int main() {
    /* outer /* inner */ this is no longer a comment */
}
```

## Whitespace and formatting

Outside of string literals, C++ mostly doesn't care about spaces, tabs, or newlines. These two
programs are identical to the compiler:

```cpp run
#include <iostream>
int main(){std::cout<<"cramped\n";}
```

```cpp run
#include <iostream>

int main()
{
    std::cout << "spacious\n";
}
```

Whitespace matters only where it separates tokens that would otherwise merge: `intx` is one name,
`int x` is a type and a name. And preprocessor directives (`#include`) must be on their own line.

Indentation is for **you**. Common brace styles:

```cpp
// "K&R" / "One True Brace": opening brace on the same line (used in this guide)
int main() {
    return 0;
}

// "Allman": opening brace on its own line
int main()
{
    return 0;
}
```

Pick one and be consistent. Most teams use an automatic formatter like `clang-format`.

## Case sensitivity and identifiers

C++ is **case-sensitive**: `main`, `Main`, and `MAIN` are three different names. Names you create
(**identifiers**) may contain letters, digits, and underscores, must not start with a digit, and
must not be a **keyword** like `int`, `return`, or `class`.

:::quiz
Which line is a valid single-line comment?

- [ ] `/ this is a comment`
- [x] `// this is a comment`
- [ ] `# this is a comment`
- [ ] `<!-- this is a comment -->`

`//` starts a comment that runs to the end of the line. `#` starts a preprocessor directive, not a comment.
:::

:::quiz
What does this print?

```cpp
std::cout << "A";
// std::cout << "B";
/* std::cout << "C"; */ std::cout << "D";
```

- [ ] `ABCD`
- [ ] `AB`
- [x] `AD`
- [ ] `A`

`B` is on a commented-out line, `C` is inside a block comment, and `D` comes after the block comment ends, so it runs.
:::

:::exercise Comment it out
This program prints four lines, but lines 2 and 4 are wrong. **Without deleting them**, comment out
the two wrong lines so the program prints:

```
apple
cherry
```

```cpp starter
#include <iostream>

int main() {
    std::cout << "apple\n";
    std::cout << "banana\n";
    std::cout << "cherry\n";
    std::cout << "durian\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "apple\n";
    // std::cout << "banana\n";
    std::cout << "cherry\n";
    /* std::cout << "durian\n"; */
}
```

```hint
Put `//` at the start of a line to turn the whole line into a comment.
```

```expected
apple
cherry
```

:::

:::exercise Tidy up
This program works but is unreadable. It's all on one line. The output must stay the same; just make
it pass. Then reformat it with one statement per line and proper indentation (the formatting itself
isn't graded, but practice it!).

The program should print:

```
x
y
z
```

```cpp starter broken
#include <iostream>
int main(){std::cout<<"x\n";std::cout<<"y\n" std::cout<<"z\n";}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "x\n";
    std::cout << "y\n";
    std::cout << "z\n";
}
```

```hint
Look carefully between `"y\n"` and the next `std::cout`. Something that ends a statement is missing.
```

```expected
x
y
z
```
:::
