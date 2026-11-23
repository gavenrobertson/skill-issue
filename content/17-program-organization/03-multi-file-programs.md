---
title: Multi-File Programs
summary: Split a program into headers and source files, declarations vs definitions, include guards and #pragma once, compiling and linking with g++, and the One Definition Rule.
---

## Why split a program?

Every program in this guide so far has been a single file. Real programs have thousands of functions
and classes; in one file they'd be impossible to navigate, every tiny change would recompile
everything, and teammates would constantly edit the same file. So C++ programs are split into many
files, each with a clear job.

> **Note:** The IDE on this site compiles a single file. In this lesson, multi-file layouts are shown as
> plain code blocks with a `// file: name` comment at the top. The runnable examples and exercises
> **simulate** a multi-file layout in one file, with comments marking which part would live in which file.
> On your own machine, you'd create the real files and build them with the commands shown.

## Declarations vs definitions

The key idea is the difference between two things you've seen since the functions module:

- A **declaration** introduces a name and its type: "this exists somewhere".
  `int add(int a, int b);` `class Player;` `extern int score;`
- A **definition** is the complete thing: the function body, the class with all its members, the variable
  with its storage. Every definition is also a declaration.

To **call** a function, the compiler only needs its declaration (to check the arguments and return
type). The **linker** later connects the call to the one definition. That split is what makes separate
files work.

## Headers and source files

The convention:

| File | Extension | Contains |
| --- | --- | --- |
| **Header** | `.h`, `.hpp` (also `.hh`, `.hxx`) | **declarations**: the interface others use |
| **Source** (implementation) | `.cpp` (also `.cc`, `.cxx`) | **definitions**: the code that does the work |

A small project:

```cpp
// file: math_utils.h  (the interface)
#pragma once

int add(int a, int b);
int multiply(int a, int b);
double average(const int* values, int count);
```

```cpp
// file: math_utils.cpp  (the implementation)
#include "math_utils.h"      // include your own header first: checks it matches

int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

double average(const int* values, int count) {
    int sum = 0;
    for (int i = 0; i < count; ++i) sum = add(sum, values[i]);
    return count ? static_cast<double>(sum) / count : 0.0;
}
```

```cpp
// file: main.cpp  (a user of the interface)
#include <iostream>
#include "math_utils.h"      // gets the declarations, not the code

int main() {
    int data[] = {2, 4, 9};
    std::cout << add(2, 3) << ' ' << multiply(4, 5) << ' ' << average(data, 3) << '\n';
}
```

`main.cpp` never sees the bodies of `add` or `average`. It compiles fine anyway, because the header
told it they exist and what their types are.

## Compiling and linking multiple files

Each `.cpp` file is compiled **separately** into an **object file**. Each one (after the preprocessor
pastes in its headers) is called a **translation unit**. Then the **linker** combines the object files
into an executable:

```
math_utils.cpp ─► [preprocess + compile] ─► math_utils.o ─┐
                                                          ├─► [link] ─► app
main.cpp       ─► [preprocess + compile] ─► main.o       ─┘
```

With `g++`, the one-step version compiles and links everything:

```
g++ -std=c++20 -Wall -Wextra main.cpp math_utils.cpp -o app
./app
```

Or step by step, which is what build tools do:

```
g++ -std=c++20 -Wall -Wextra -c math_utils.cpp      # -c: compile only -> math_utils.o
g++ -std=c++20 -Wall -Wextra -c main.cpp            #                  -> main.o
g++ main.o math_utils.o -o app                      # link the object files
```

Why bother with the separate steps? If you change only `main.cpp`, you recompile only `main.o` and
relink. In a project with 2,000 files, that's the difference between seconds and an hour. **Build
systems** like Make, Ninja, and **CMake** track what changed and run exactly these commands for you:

```
# file: CMakeLists.txt  (the de facto standard build description)
cmake_minimum_required(VERSION 3.20)
project(app CXX)
set(CMAKE_CXX_STANDARD 20)
add_executable(app main.cpp math_utils.cpp)
```

Headers are **never** compiled on their own and never listed on the `g++` command line. They're only
ever pasted into `.cpp` files by `#include`.

## A one-file simulation

Here's the same project collapsed into one runnable file. The "header" part declares, `main` uses, and
the "source" part defines, below `main`. Because the declarations come first, `main` compiles even though
the definitions come later, exactly like separate files:

```cpp run
#include <iostream>

// ===== math_utils.h =====
int add(int a, int b);
int multiply(int a, int b);
double average(const int* values, int count);

// ===== main.cpp =====
int main() {
    int data[] = {2, 4, 9};
    std::cout << add(2, 3) << ' ' << multiply(4, 5) << ' ' << average(data, 3) << '\n';
}

// ===== math_utils.cpp =====
int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

double average(const int* values, int count) {
    int sum = 0;
    for (int i = 0; i < count; ++i) sum = add(sum, values[i]);
    return count ? static_cast<double>(sum) / count : 0.0;
}
```

```output
5 20 5
```

Without the declarations at the top, the compiler would reach `add(2, 3)` before seeing anything named
`add`:

```cpp compile-error
#include <iostream>

int main() {
    std::cout << add(2, 3) << '\n';   // error: 'add' was not declared in this scope
}

int add(int a, int b) { return a + b; }
```

And with a declaration but **no definition anywhere**, compiling succeeds but **linking** fails. That's
the error you get when you forget to add a `.cpp` file to the build command:

```cpp compile-error
#include <iostream>

int add(int a, int b);                // declared...

int main() {
    std::cout << add(2, 3) << '\n';   // ...but never defined: "undefined reference to `add(int, int)'"
}
```

## Include guards and `#pragma once`

Headers include other headers. It's easy for one translation unit to end up including the same header
**twice** (say `main.cpp` includes `player.h` and `game.h`, and `game.h` also includes `player.h`). If
the header defines a class, the class is then defined twice, which is an error:

```cpp compile-error
// what the compiler sees if point.h is pasted in twice:
struct Point { int x; int y; };
struct Point { int x; int y; };   // error: redefinition of 'struct Point'

int main() {}
```

Every header needs protection against that. The traditional way is an **include guard**:

```cpp
// file: point.h
#ifndef POINT_H          // if we haven't seen this header yet...
#define POINT_H          // ...remember that we have...

struct Point {
    int x;
    int y;
};

#endif                   // ...end of the guarded region
```

The first time, `POINT_H` isn't defined, so everything is kept and `POINT_H` gets defined. The second
time, `#ifndef POINT_H` is false and the whole file is skipped. The macro name must be **unique per
header**; a common style is `PROJECT_PATH_FILE_H`.

The modern alternative is one line at the top:

```cpp
// file: point.h
#pragma once

struct Point {
    int x;
    int y;
};
```

`#pragma once` isn't technically standard, but every major compiler supports it, it can't suffer from
two headers accidentally using the same guard name, and it's shorter. Use either one, but **every header
gets one**.

## The One Definition Rule (ODR)

The **One Definition Rule** says:

1. Within one translation unit, anything may be **defined at most once** (include guards ensure this for headers).
2. Across the whole program, every **non-inline function and variable** that's used must be defined
   **exactly once**: in one `.cpp` file.
3. Things that are allowed to appear in **several** translation units (class definitions, `inline`
   functions and variables, templates, `constexpr` functions) must be defined **identically** everywhere.

The practical consequence is what goes where:

| Put in a **header** | Put in a **`.cpp` file** |
| --- | --- |
| function declarations | function definitions (non-inline) |
| class definitions (with member declarations) | out-of-class member function definitions |
| `inline` functions, member functions defined inside the class | definitions of global variables |
| templates (fully defined: the compiler needs the body to instantiate them) | file-private helpers (anonymous namespace) |
| `constexpr` / `inline` constants, type aliases, enums | `#include`s needed only by the implementation |
| `extern` declarations of global variables | |

What happens if you break rule 2? Suppose a header **defines** a plain function, and two `.cpp` files
include it:

```cpp
// file: helpers.h
#pragma once
int twice(int x) { return 2 * x; }    // a DEFINITION in a header: ODR trouble
```

```
$ g++ a.cpp b.cpp -o app
/usr/bin/ld: b.o: in function `twice(int)':
b.cpp:(.text+0x0): multiple definition of `twice(int)'; a.o:a.cpp:(.text+0x0): first defined here
```

`#pragma once` doesn't help: it only prevents double inclusion **within one** translation unit. Each
`.cpp` still gets its own copy. Fixes: move the body to a `.cpp` file, or mark it `inline`
(`inline int twice(int x) { ... }`), which tells the linker "identical copies are expected; keep one".

> **Pitfall:** Templates are the exception people trip over in the other direction. If you put a
> template's definition in a `.cpp` file and only its declaration in the header, other files can't
> instantiate it and you get "undefined reference" link errors. Keep templates fully in headers.

## Classes across files

A class definition goes in the header; member function bodies usually go in the `.cpp`, written with
the `ClassName::` prefix:

```cpp
// file: counter.h
#pragma once
#include <string>

class Counter {
public:
    explicit Counter(std::string name);
    void increment();
    int value() const { return count_; }   // defined in the class: implicitly inline, fine in a header
    const std::string& name() const;
private:
    std::string name_;
    int count_ = 0;
};
```

```cpp
// file: counter.cpp
#include "counter.h"
#include <utility>

Counter::Counter(std::string name) : name_(std::move(name)) {}
void Counter::increment() { ++count_; }
const std::string& Counter::name() const { return name_; }
```

## Header hygiene

- **Include what you use.** Each file includes the headers for the things it uses directly, rather than
  relying on another header to include them by accident.
- **Use forward declarations** when a header only needs a name, not its full definition, for example to
  declare a pointer or reference parameter: `class Texture;` then `void draw(const Texture& t);`. This
  speeds up builds and breaks circular dependencies (`a.h` includes `b.h` which includes `a.h`).
- **No `using namespace` at file scope in headers** (namespaces lesson).
- **Put your code in a namespace**, so your `Counter` can't clash with someone else's.
- **Include your own header first** in its `.cpp` file. If the header forgot an include it needs, you'll
  find out right there.

```cpp run
#include <iostream>

// ===== shapes.h =====
class Texture;                        // forward declaration: enough for references/pointers

struct Sprite {
    const Texture* texture = nullptr; // pointer to an incomplete type is fine
    int x = 0;
};
void describe(const Texture& t);

// ===== texture.h =====
struct Texture {
    int width;
    int height;
};

// ===== main.cpp =====
int main() {
    Texture t{64, 32};
    Sprite s{&t, 10};
    describe(*s.texture);
}

// ===== shapes.cpp =====
void describe(const Texture& t) {
    std::cout << "texture " << t.width << 'x' << t.height << '\n';
}
```

```output
texture 64x32
```

:::quiz
Your build fails with ``undefined reference to `parse(std::string const&)'``. What's the most likely cause?

- [ ] You forgot `#include` for the header that declares `parse`
- [x] The `.cpp` file that defines `parse` wasn't compiled/linked, or `parse` was never defined
- [ ] There's a missing semicolon in `main.cpp`
- [ ] The header is missing `#pragma once`

"undefined reference" is a **linker** error: the declaration was seen (so compiling worked), but no
object file supplied the definition. A missing include would be a compile error ("was not declared").
:::

:::quiz
Which of these belong in a header file? (select all that apply)

- [x] A class definition
- [x] A function template's full definition
- [ ] The body of a non-inline, non-template function
- [x] An `inline constexpr` constant

Non-inline function bodies go in exactly one `.cpp` file; putting them in a header included by two
`.cpp` files violates the One Definition Rule ("multiple definition" link error).
:::

:::quiz
What problem does an include guard (or `#pragma once`) solve?

- [x] The same header being pasted into one translation unit more than once
- [ ] The same function being defined in two different `.cpp` files
- [ ] Slow linking
- [ ] Missing definitions

Guards work per translation unit. They prevent redefinition errors from double inclusion, but they
can't stop two `.cpp` files from each compiling their own copy of a non-inline definition.
:::

:::exercise Declare before use {easy}
This "multi-file" program lost its header: `main` calls `celsiusToFahrenheit` and `describe`, which are
defined **below** `main`, so it doesn't compile. Add the missing **declarations** (prototypes) in the
header section at the top. Don't move the definitions.

The program reads Celsius temperatures and prints, for each one, `<c>C = <f>F (<description>)`.

```cpp starter broken
#include <iostream>
#include <string>

// ===== temperature.h =====
// declarations go here

// ===== main.cpp =====
int main() {
    double c;
    while (std::cin >> c) {
        std::cout << c << "C = " << celsiusToFahrenheit(c) << "F (" << describe(c) << ")\n";
    }
}

// ===== temperature.cpp =====
double celsiusToFahrenheit(double c) {
    return c * 9.0 / 5.0 + 32.0;
}

std::string describe(double c) {
    if (c < 0) return "freezing";
    if (c < 20) return "cool";
    if (c < 30) return "warm";
    return "hot";
}
```

```cpp solution
#include <iostream>
#include <string>

// ===== temperature.h =====
double celsiusToFahrenheit(double c);
std::string describe(double c);

// ===== main.cpp =====
int main() {
    double c;
    while (std::cin >> c) {
        std::cout << c << "C = " << celsiusToFahrenheit(c) << "F (" << describe(c) << ")\n";
    }
}

// ===== temperature.cpp =====
double celsiusToFahrenheit(double c) {
    return c * 9.0 / 5.0 + 32.0;
}

std::string describe(double c) {
    if (c < 0) return "freezing";
    if (c < 20) return "cool";
    if (c < 30) return "warm";
    return "hot";
}
```

```hint
A declaration is the function's first line with a semicolon instead of the body:
`double celsiusToFahrenheit(double c);`
```

```stdin
100 0 25
```

```expected
100C = 212F (hot)
0C = 32F (cool)
25C = 77F (warm)
```

```stdin
-40 37.5
```

```expected hidden
-40C = -40F (freezing)
37.5C = 99.5F (hot)
```

```stdin
19.9 20 29.99 30
```

```expected hidden
19.9C = 67.82F (cool)
20C = 68F (warm)
29.99C = 85.982F (warm)
30C = 86F (hot)
```

```checks
must double\s+celsiusToFahrenheit\s*\([^)]*\)\s*; :: Declare celsiusToFahrenheit with a prototype.
must std::string\s+describe\s*\([^)]*\)\s*; :: Declare describe with a prototype.
```
:::

:::exercise Guard the header {easy}
The starter simulates what happens when `#include "money.h"` appears twice in one translation unit:
the header's text is pasted in **twice**. That redefines `struct Money` and `inline` function `cents`,
so it doesn't compile.

Without deleting either copy, wrap **each** copy of the header text in the same include guard
(`#ifndef MONEY_H` / `#define MONEY_H` / `#endif`) so that the second copy is skipped. Then complete
`main`: read dollars and cents for two amounts and print their total as `$<dollars>.<cents>` with two
cent digits.

```cpp starter broken
#include <iostream>

// ===== money.h (first #include) =====
struct Money {
    int dollars;
    int cents;
};

inline int totalCents(Money m) { return m.dollars * 100 + m.cents; }

// ===== money.h (second #include of the same file) =====
struct Money {
    int dollars;
    int cents;
};

inline int totalCents(Money m) { return m.dollars * 100 + m.cents; }

// ===== main.cpp =====
int main() {
    Money a{}, b{};
    std::cin >> a.dollars >> a.cents >> b.dollars >> b.cents;
    // print the total as $D.CC
}
```

```cpp solution
#include <iostream>

// ===== money.h (first #include) =====
#ifndef MONEY_H
#define MONEY_H
struct Money {
    int dollars;
    int cents;
};

inline int totalCents(Money m) { return m.dollars * 100 + m.cents; }
#endif

// ===== money.h (second #include of the same file) =====
#ifndef MONEY_H
#define MONEY_H
struct Money {
    int dollars;
    int cents;
};

inline int totalCents(Money m) { return m.dollars * 100 + m.cents; }
#endif

// ===== main.cpp =====
int main() {
    Money a{}, b{};
    std::cin >> a.dollars >> a.cents >> b.dollars >> b.cents;
    int total = totalCents(a) + totalCents(b);
    int c = total % 100;
    std::cout << '$' << total / 100 << '.' << (c < 10 ? "0" : "") << c << '\n';
}
```

```hint
The real `money.h` file would contain the guard, so both pasted copies contain it too. Add the same
three directives around each copy.
```

```hint
Add the two amounts in cents, then split back into dollars (`/ 100`) and cents (`% 100`).
```

```stdin
3 50 1 75
```

```expected
$5.25
```

```stdin
0 0 0 5
```

```expected hidden
$0.05
```

```stdin
1 99 0 1
```

```expected hidden
$2.00
```

```stdin
10 0 20 0
```

```expected
$30.00
```

```checks
must (#ifndef\s+MONEY_H[\s\S]*){2} :: Guard both copies with #ifndef MONEY_H.
must (#define\s+MONEY_H[\s\S]*){2} :: Each guard needs #define MONEY_H.
must (#endif[\s\S]*){2} :: Close each guard with #endif.
```
:::

:::exercise Split the class {medium}
A stack of integers is split across "files". The class definition (the header part) is given, with
**declarations** of its member functions. Write the member function **definitions** out of class, in the
source-file section, using `IntStack::` (for example `void IntStack::push(int value) { ... }`).

`main` (given) processes commands: `push <n>`, `pop` (prints the popped value, or `empty` if there is
none), `top` (prints the top value, or `empty`), and `size` (prints the size).

```cpp starter
#include <iostream>
#include <string>
#include <vector>

// ===== int_stack.h =====
class IntStack {
public:
    void push(int value);
    bool pop(int& out);         // false if empty
    bool top(int& out) const;   // false if empty
    int size() const;
private:
    std::vector<int> items_;
};

// ===== main.cpp =====
int main() {
    IntStack s;
    std::string cmd;
    while (std::cin >> cmd) {
        int v;
        if (cmd == "push") {
            std::cin >> v;
            s.push(v);
        } else if (cmd == "pop") {
            if (s.pop(v)) std::cout << v << '\n';
            else std::cout << "empty\n";
        } else if (cmd == "top") {
            if (s.top(v)) std::cout << v << '\n';
            else std::cout << "empty\n";
        } else if (cmd == "size") {
            std::cout << s.size() << '\n';
        }
    }
}

// ===== int_stack.cpp =====
void IntStack::push(int) {}
bool IntStack::pop(int&) { return false; }
bool IntStack::top(int&) const { return false; }
int IntStack::size() const { return 0; }
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

// ===== int_stack.h =====
class IntStack {
public:
    void push(int value);
    bool pop(int& out);         // false if empty
    bool top(int& out) const;   // false if empty
    int size() const;
private:
    std::vector<int> items_;
};

// ===== main.cpp =====
int main() {
    IntStack s;
    std::string cmd;
    while (std::cin >> cmd) {
        int v;
        if (cmd == "push") {
            std::cin >> v;
            s.push(v);
        } else if (cmd == "pop") {
            if (s.pop(v)) std::cout << v << '\n';
            else std::cout << "empty\n";
        } else if (cmd == "top") {
            if (s.top(v)) std::cout << v << '\n';
            else std::cout << "empty\n";
        } else if (cmd == "size") {
            std::cout << s.size() << '\n';
        }
    }
}

// ===== int_stack.cpp =====
void IntStack::push(int value) {
    items_.push_back(value);
}

bool IntStack::pop(int& out) {
    if (items_.empty()) return false;
    out = items_.back();
    items_.pop_back();
    return true;
}

bool IntStack::top(int& out) const {
    if (items_.empty()) return false;
    out = items_.back();
    return true;
}

int IntStack::size() const {
    return static_cast<int>(items_.size());
}
```

```hint
Out-of-class definitions repeat the full signature, including `const`: `bool IntStack::top(int& out) const { ... }`.
```

```stdin
push 1
push 2
top
size
pop
pop
pop
size
```

```expected
2
2
2
1
empty
0
```

```stdin
pop
top
push -7
top
```

```expected hidden
empty
empty
-7
```

```stdin
push 5
push 6
pop
push 7
size
top
pop
pop
pop
size
top
```

```expected hidden
6
2
7
7
5
empty
0
empty
```

```checks
must IntStack::push\s*\(\s*int\s+\w+\s*\) :: Define IntStack::push out of class.
must IntStack::pop\s*\(\s*int\s*&\s*\w+\s*\) :: Define IntStack::pop out of class.
must IntStack::top\s*\(\s*int\s*&\s*\w+\s*\)\s*const :: Define IntStack::top out of class (it's const).
mustnot class\s+IntStack\s*\{[^}]*\{ :: Keep the member function bodies out of the class definition.
```
:::
