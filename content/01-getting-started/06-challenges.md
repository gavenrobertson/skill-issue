---
title: "Getting Started: Challenges"
summary: Hard puzzles using only what this module taught. Printing exact text, escape sequences, comments, and repairing broken programs.
---

These challenges are meant to be **hard**, even though they use nothing but `std::cout`, string
literals, escape sequences and comments. Every character of the output must match exactly, so read
each specification slowly. Try every problem on your own before you open a hint, and treat the
**Solution** button as a last resort. Getting stuck for a while and then working it out is how this
material sticks.

None of these programs read input. The checker runs each one several times, sometimes feeding it
some text on standard input, and your program should simply ignore it and print the same thing
every time.

:::exercise Print the source {hard}
Print the complete source code of the classic Hello World program, **exactly** as shown below. It has
five lines: the blank second line is part of the output, and the `std::cout` line is indented with
**four spaces**.

```
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
}
```

Notice that the output contains a backslash followed by `n`: two visible characters, **not** a line
break.

**Rules:** use ordinary string literals with escape sequences. Raw strings (`R"(...)"`) are not allowed.

```cpp starter
#include <iostream>

int main() {
    std::cout << "#include <iostream>\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "#include <iostream>\n";
    std::cout << "\n";
    std::cout << "int main() {\n";
    std::cout << "    std::cout << \"Hello, World!\\n\";\n";
    std::cout << "}\n";
}
```

```hint
Write one `std::cout` statement per output line. The blank line is just `"\n"`.
```

```hint
On the fourth line, every `"` you want to *print* must be written `\"`, and the backslash you want to
print must be written `\\`. So the visible text `\n` is written `\\n` in your string.
```

```expected
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
}
```

```stdin
hello
```

```expected hidden
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
}
```

```stdin
1 2 3
```

```expected hidden
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
}
```

```checks
must std::cout :: Print with std::cout.
mustnot R" :: Raw string literals are not allowed here: use escape sequences.
```
:::

:::exercise Escape inception {hard}
Print these **two lines of C++ code** exactly as shown. The second line is a statement that would
itself print the first kind of line, so it has escapes *inside* escapes.

```
std::cout << "Tab:\tQuote:\"\n";
std::cout << "std::cout << \"Hi\\n\";\n";
```

Every backslash and double quote above is part of the output. There is no tab character in the
output: `\t` is printed as a backslash followed by `t`.

**Rules:** ordinary string literals only, no raw strings.

```cpp starter
#include <iostream>

int main() {
    // print the two lines
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "std::cout << \"Tab:\\tQuote:\\\"\\n\";\n";
    std::cout << "std::cout << \"std::cout << \\\"Hi\\\\n\\\";\\n\";\n";
}
```

```hint
Work one character at a time. To print `\` write `\\`. To print `"` write `\"`. So to print the two
characters `\"` you need `\\` followed by `\"`, which is `\\\"`.
```

```hint
The second line contains `\\n`, a backslash, another backslash and an `n`. That takes **five**
characters in your string: `\\\\n`.
```

```expected
std::cout << "Tab:\tQuote:\"\n";
std::cout << "std::cout << \"Hi\\n\";\n";
```

```stdin
\n
```

```expected hidden
std::cout << "Tab:\tQuote:\"\n";
std::cout << "std::cout << \"Hi\\n\";\n";
```

```stdin
"quoted" input
```

```expected hidden
std::cout << "Tab:\tQuote:\"\n";
std::cout << "std::cout << \"Hi\\n\";\n";
```

```checks
must std::cout :: Print with std::cout.
mustnot R" :: Raw string literals are not allowed here: use escape sequences.
```
:::

:::exercise Repair shop {hard}
This program is broken in **seven** places. Some mistakes stop it from compiling, one only shows up
when the program is **linked**, and some compile fine but print the wrong thing. Fix every one so the
program prints exactly:

```
Status: "fixed"
Path: C:\temp\new
Done!
```

Fix the code; don't just replace it with a new program. Expect the compiler to report only some of the
problems at first: fix the first error, run again, and repeat. Once it compiles, compare the output
character by character.

```cpp starter broken
#include <iostream>

/* Repair shop /* version 2 */ */
int Main() {
    std::cout << "Status: "fixed"\n"
    std::Cout << "Path: C:\temp\new\n";
    std::cout << 'Done!' << '\n';
    return 0;
```

```cpp solution
#include <iostream>

/* Repair shop, version 2 */
int main() {
    std::cout << "Status: \"fixed\"\n";
    std::cout << "Path: C:\\temp\\new\n";
    std::cout << "Done!" << '\n';
    return 0;
}
```

```hint
Block comments don't nest. Where does the comment on line 3 really end, and what is left over after it?
```

```hint
`undefined reference to main` is a **link** error: every program needs a function named exactly `main`.
And count the braces: every `{` needs a matching `}`.
```

```hint
Once it compiles, look at the output. `\t` and `\n` inside the path are escape sequences, and `'Done!'`
in **single** quotes is a (strange) multi-character constant, not a string.
```

```expected
Status: "fixed"
Path: C:\temp\new
Done!
```

```stdin
fix me
```

```expected hidden
Status: "fixed"
Path: C:\temp\new
Done!
```

```stdin
C:\temp
```

```expected hidden
Status: "fixed"
Path: C:\temp\new
Done!
```

```checks
must \bint\s+main\s*\( :: The program needs a function named main.
must std::cout :: Keep printing with std::cout.
```
:::

:::exercise ASCII cat {hard}
Print this cat using **exactly one** `<<` in your whole program: a single `std::cout << ...;` statement
with one insertion. Look carefully: lines start with spaces, and the art contains backslashes and
double quotes.

```
  /\_/\
 ( o.o )
  > ^ <
 /|   |\
"meow!"
```

**Rules:** one `<<` only, no raw strings, no `std::endl`.

```cpp starter
#include <iostream>

int main() {
    std::cout << "  /\\_/\\\n" << " ( o.o )\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "  /\\_/\\\n"
                 " ( o.o )\n"
                 "  > ^ <\n"
                 " /|   |\\\n"
                 "\"meow!\"\n";
}
```

```hint
Remember from **Hello, World!**: adjacent string literals are glued together by the compiler.
`"ab" "cd"` is the same as `"abcd"`, and you can put each piece on its own source line.
```

```hint
Each backslash in the art is `\\` in the source, and each line needs its own `\n`. Line 4 ends with a
backslash followed by a newline: `\\\n`.
```

```expected
  /\_/\
 ( o.o )
  > ^ <
 /|   |\
"meow!"
```

```stdin
meow
```

```expected hidden
  /\_/\
 ( o.o )
  > ^ <
 /|   |\
"meow!"
```

```stdin
woof
```

```expected hidden
  /\_/\
 ( o.o )
  > ^ <
 /|   |\
"meow!"
```

```checks
must std::cout :: Print with std::cout.
mustnot <<[\s\S]*<< :: Use exactly one << (glue adjacent string literals together instead).
mustnot R" :: Raw string literals are not allowed here.
mustnot endl :: Use \n, not std::endl.
```
:::

:::quiz
What does this program print?

```cpp
#include <iostream>

int main() {
    std::cout << "1" /* "2" */ "3"; // "4"
    std::cout << "5" "\\n" << '6';
}
```

- [ ] `1356`
- [x] `135\n6`, where `\n` is a visible backslash followed by `n`
- [ ] `135`, then a line break, then `6`
- [ ] It doesn't compile: two string literals can't be next to each other

The block comment disappears, leaving `"1" "3"`: adjacent literals are glued into `"13"`. The `// "4"`
comment runs to the end of the line. On the next line, `"\\n"` is an escaped backslash followed by an
ordinary `n`, so no line break is printed.
:::

:::quiz
What does `std::cout << "C:\new\table";` print?

- [ ] `C:\new\table`
- [x] `C:`, then a line break, then `ew`, a tab, and `able`
- [ ] `C:ewable`
- [ ] Nothing: it's a compile error because `\e` is not an escape

`\n` is a newline and `\t` is a tab, so the "path" is cut into pieces. To print a backslash, write
`\\` (or use a raw string `R"(C:\new\table)"`).
:::
