---
title: What Is C++?
summary: Where C++ came from, what "compiled" means, and the four steps that turn source code into a program.
---

## A language for talking to the machine, at high level

**C++** is a general-purpose programming language created by **Bjarne Stroustrup** at Bell Labs,
starting in 1979 as "C with Classes". It was built on top of the **C** language and adds features for
organizing large programs (classes, templates, namespaces, exceptions, and more) **without giving up
C's speed**.

C++ is used where performance and control matter: game engines, browsers (Chrome, Firefox), databases,
operating systems, trading systems, embedded devices, compilers, and the runtimes of other languages.

Its core design idea is the **zero-overhead principle**: *you don't pay for what you don't use, and what
you do use is as efficient as anything you could reasonably write by hand.*

## Compiled vs. interpreted

Your computer's CPU only understands **machine code**: binary instructions specific to the processor.
Humans write **source code** in a language like C++. Something has to translate it.

- An **interpreted** language (like Python) is translated *while it runs*, line by line, by another program.
- A **compiled** language (like C++) is translated **ahead of time** by a **compiler** into a standalone
  executable file of machine code. When you run it, no translator is needed, so it's fast.

A consequence: in C++, many mistakes are caught **before your program ever runs**, at compile time.
That's a good thing. A compile error is the compiler protecting you.

## From source code to executable: the build pipeline

When you press **Run**, four things happen:

1. **Preprocessing**: lines starting with `#` (like `#include <iostream>`) are handled. `#include`
   literally pastes the contents of another file (a *header*) into yours.
2. **Compilation**: each source file (`.cpp`) is checked for errors and translated into machine code,
   producing an **object file** (`.o` / `.obj`).
3. **Linking**: the **linker** combines your object files with the libraries you used (like the
   standard library that implements `std::cout`) into a single **executable**.
4. **Running**: the operating system loads the executable and starts it at the function called `main`.

```
 hello.cpp ──► [preprocessor] ──► [compiler] ──► hello.o ──► [linker] ──► hello (executable)
                    ▲                                            ▲
               #include files                            standard library
```

On your own computer you'd do all that with one command:

```
g++ -std=c++20 -Wall -Wextra hello.cpp -o hello
./hello
```

- `g++`: the GCC C++ compiler (others: `clang++`, and Microsoft's `cl` in Visual Studio)
- `-std=c++20`: which version of the C++ standard to use
- `-Wall -Wextra`: turn on warnings (always do this!)
- `-o hello`: name of the output file

## Versions of C++

C++ is defined by an ISO **standard**, updated every three years. Each version adds features:

| Standard | Highlights |
| --- | --- |
| C++98/03 | The first standard: classes, templates, STL containers, exceptions |
| **C++11** | The "modern C++" revolution: `auto`, lambdas, range-for, smart pointers, move semantics, `nullptr` |
| C++14 | Polish: generic lambdas, `std::make_unique`, relaxed `constexpr` |
| C++17 | `std::optional`, `std::variant`, structured bindings, `if constexpr`, `std::string_view` |
| **C++20** | Concepts, ranges, `<=>`, modules, coroutines, `std::format`, designated initializers |
| C++23 | `std::print`, `std::expected`, deducing `this`, more ranges |

This guide teaches **C++20**, and points out when something is newer or older.

:::quiz
Which program combines object files and libraries into a final executable?

- [ ] The preprocessor
- [ ] The compiler
- [x] The linker
- [ ] The operating system

The linker resolves references between object files and libraries and produces the executable.
:::

:::quiz
What does `#include <iostream>` do?

- [x] Pastes the contents of the `iostream` header into your file before compilation
- [ ] Downloads the iostream library from the internet
- [ ] Runs a program called iostream
- [ ] Nothing. It's a comment

`#include` is a preprocessor directive. It copies the header's declarations into your file so the
compiler knows what `std::cout` and friends are.
:::

:::quiz
In which order do these happen? (pick the correct sequence)

- [ ] compile → preprocess → link → run
- [x] preprocess → compile → link → run
- [ ] link → compile → preprocess → run
- [ ] preprocess → link → compile → run

Source is preprocessed first, then compiled to object code, then linked into an executable, then run.
:::

:::exercise Print the pipeline {easy}
Print the four stages of building and running a C++ program, one per line, numbered exactly like this:

```
1. Preprocess
2. Compile
3. Link
4. Run
```

```cpp starter
#include <iostream>

int main() {
    std::cout << "1. Preprocess\n";
    // print the other three lines
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "1. Preprocess\n";
    std::cout << "2. Compile\n";
    std::cout << "3. Link\n";
    std::cout << "4. Run\n";
}
```

```hint
Copy the existing `std::cout` line three times and change the text. Every line ends with `\n`.
```

```expected
1. Preprocess
2. Compile
3. Link
4. Run
```
:::
