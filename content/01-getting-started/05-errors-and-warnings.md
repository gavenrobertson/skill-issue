---
title: Errors, Warnings & Debugging
summary: The four kinds of bugs, how to read a compiler error message, and why warnings are your friends.
---

Everyone writes bugs. Professionals just get fast at finding them. There are four kinds.

## 1. Compile-time (syntax and type) errors

The compiler refuses to build your program. Nothing runs. Examples: a missing semicolon, a misspelled
name, using a variable that doesn't exist, putting text where a number is required.

```cpp compile-error
#include <iostream>

int main() {
    std::cout << "Hello\n"
    std::cout << "World\n";
}
```

GCC reports something like:

```
main.cpp: In function 'int main()':
main.cpp:4:27: error: expected ';' before 'std'
    4 |     std::cout << "Hello\n"
      |                           ^
      |                           ;
    5 |     std::cout << "World\n";
      |     ~~~
```

How to read it:

- `main.cpp:4:27` is **file : line : column**. Go there first.
- `error:` is followed by the message. Here the compiler even suggests the fix (`;`).
- The real mistake is often **just before** the reported spot. The compiler only noticed the problem
  when it reached the next token.
- **Fix the first error first.** One mistake can cause a cascade of confusing follow-up errors.
  Fix it, rebuild, repeat.

## 2. Link errors

Every file compiled, but the **linker** can't find something you used, usually a function you
declared but never defined.

```cpp compile-error
void greet();          // declared: "this function exists somewhere"

int main() {
    greet();           // linker: undefined reference to `greet()'
}
```

Link errors mention `undefined reference to` (GCC/Clang) or `unresolved external symbol` (MSVC).

## 3. Runtime errors

The program compiles and starts, then crashes or misbehaves while running: dividing an integer by
zero, reading outside an array, running out of memory. In C++, many of these are
**undefined behavior (UB)**: the language makes *no promises* about what happens. It might crash, print
garbage, or appear to work today and break tomorrow. Much of learning C++ well is learning to avoid UB.

## 4. Logic errors

The program runs fine and does **the wrong thing**: you used `+` where you meant `-`, or your loop runs
one time too many. The compiler can't help here. You find these by testing (which is exactly what
the **Check** button does) and by reasoning about your code.

## Warnings

A **warning** means "this is legal, but it looks like a mistake." The IDE compiles with `-Wall -Wextra`,
which enables lots of useful warnings. Treat warnings as errors in your head. They're the compiler
pointing at bugs before they happen.

```cpp run warns
#include <iostream>

int main() {
    int unused = 5;        // warning: unused variable 'unused'
    std::cout << "This compiles, but read the warning in the output panel!\n";
}
```

## Debugging strategies

- **Read the error message.** Really read it, starting with the first one.
- **Print things.** Add `std::cout` lines to see what values your variables have and which code runs.
  ("printf debugging" is the most-used debugging technique in the world.)
- **Shrink the problem.** Comment out code until the bug disappears; the last thing you removed is involved.
- **Rubber duck.** Explain your code line by line, out loud. You'll often hear the bug.
- **Use a debugger** (gdb, lldb, or your IDE's) on your own machine to step through code line by line.

:::quiz
`main.cpp:12:5: error: 'coutt' is not a member of 'std'`. What kind of error is this, and where?

- [x] A compile error at line 12, column 5
- [ ] A link error at line 5, column 12
- [ ] A runtime error that happens 12 times
- [ ] A warning, so the program still runs

The format is file:line:column, and `error:` from the compiler means the program wasn't built.
:::

:::quiz
Your program compiles and runs but prints `7` where you expected `8`. What kind of bug is this?

- [ ] Compile error
- [ ] Link error
- [ ] Undefined behavior, always
- [x] Logic error

It built and ran, but did the wrong thing: a logic error. (It *could* be caused by UB, but the symptom is a wrong result.)
:::

:::exercise Fix the build {medium}
This program has **three** compile errors. Fix them all so it prints:

```
Debugging is twice as hard as writing the code.
- Brian Kernighan
```

```cpp starter broken
#include <iostream>

int main() {
    std::cout << "Debugging is twice as hard as writing the code.\n"
    std::Cout << "- Brian Kernighan\n";
    return 0
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "Debugging is twice as hard as writing the code.\n";
    std::cout << "- Brian Kernighan\n";
    return 0;
}
```

```hint
Run it and read the **first** error. Fix it, run again, and repeat.
```

```hint
Two semicolons are missing, and C++ is case-sensitive: is it `Cout` or `cout`?
```

```expected
Debugging is twice as hard as writing the code.
- Brian Kernighan
```
:::

:::exercise Missing include {easy}
The program below forgot something at the very top, so the compiler doesn't know what `std::cout`
is. Fix it so it prints `Found it!`.

```cpp starter broken
int main() {
    std::cout << "Found it!\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "Found it!\n";
}
```

```hint
`std::cout` is declared in the `<iostream>` header.
```

```expected
Found it!
```

```checks
must #include\s*<iostream> :: Include the <iostream> header.
```
:::
