---
title: main, Exit Codes & Command-Line Arguments
summary: The two forms of main, reading argc and argv, return codes and EXIT_SUCCESS/EXIT_FAILURE, and ending a program early with std::exit.
---

`main` is a function like any other, with a few special rules. It's where your program starts, and
its parameters and return value are how your program talks to whoever **launched** it: usually a
terminal (shell), a script, or another program.

## The two standard forms

```cpp
int main() { /* ... */ }
int main(int argc, char* argv[]) { /* ... */ }
```

The second one receives the **command-line arguments**. When you run a program from a terminal like
this:

```
$ ./greet Ada 3
```

the operating system splits the line into words and passes them to `main`:

| | Value |
| --- | --- |
| `argc` (argument **c**ount) | `3` |
| `argv[0]` | `"./greet"`, the program's name (or path) |
| `argv[1]` | `"Ada"` |
| `argv[2]` | `"3"` (text, not a number!) |
| `argv[3]` | a null pointer, marking the end |

`argv` (argument **v**ector) is an array of C strings: `char* argv[]` means "an array of pointers to
characters". You'll learn exactly what that means in the C strings lesson and in module 08. For now,
`argv[i]` is the i-th word, and you can turn it into a `std::string`.

`char** argv` is an equivalent spelling you'll see often. The names `argc`/`argv` are just a strong
convention; any names work.

Special rules for `main`:

- It must return `int`. (`void main()` is not standard C++.)
- It's the only non-void function where falling off the end is fine: it returns `0`.
- You may not call `main` yourself, overload it, or make it `inline`, `static` or `constexpr`.

## Reading the arguments

```cpp run
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    std::cout << "argc = " << argc << '\n';
    for (int i = 1; i < argc; ++i) {          // start at 1 to skip the program name
        std::string arg = argv[i];            // convert to std::string for easy use
        std::cout << "argument " << i << ": " << arg << '\n';
    }
}
```

```output
argc = 1
```

Run in this IDE, there are no arguments, so `argc` is `1` (just the program name) and the loop body
never runs. Compiled on your own machine and run as `./a.out hello world`, it would print:

```
argc = 3
argument 1: hello
argument 2: world
```

> **Note:** `argc` is always at least 1 on normal systems, because `argv[0]` is the program name.
> Forgetting that and starting your loop at `0` is a classic off-by-one.

### Arguments are text

Every argument is a string, even `3`. To use it as a number, convert it, e.g. with `std::stoi`
(string to int) from `<string>`, which you'll meet properly in the `std::string` lesson:

```cpp run
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    std::string name = "World";
    int times = 1;
    if (argc > 1) name = argv[1];
    if (argc > 2) times = std::stoi(argv[2]);   // "3" -> 3

    for (int i = 0; i < times; ++i) {
        std::cout << "Hello, " << name << "!\n";
    }
}
```

```output
Hello, World!
```

Always check `argc` before reading `argv[i]`. Reading past the end of `argv` is undefined behavior.

## Exit codes

`main`'s return value becomes the program's **exit code** (or *exit status*). By universal
convention:

- `0` means **success**.
- anything else means **failure**, and programs often use different numbers for different problems.

Scripts and other programs check it. In a Unix shell, `$?` holds the last exit code, and `&&` runs
the next command only if the previous one succeeded:

```
$ ./build && ./run-tests      # run-tests only runs if build returned 0
$ echo $?                     # print the last exit code
```

On Linux and macOS only the lowest 8 bits are kept, so use values from 0 to 255.

### `EXIT_SUCCESS` and `EXIT_FAILURE`

`<cstdlib>` defines two portable constants. They make intent obvious when reading code:

```cpp
#include <cstdlib>
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "usage: " << argv[0] << " <name>\n";   // errors go to std::cerr
        return EXIT_FAILURE;                                // usually 1
    }
    std::cout << "Hello, " << argv[1] << "!\n";
    return EXIT_SUCCESS;                                    // 0
}
```

Error messages conventionally go to `std::cerr` (the **standard error** stream) rather than
`std::cout`, so they still reach the user when normal output is redirected to a file.

> **Note:** The exercises on this site expect your program to exit with code 0. A non-zero exit code
> is reported as a failure, which is exactly what exit codes are for!

## Ending the program early: `std::exit`

`return` from `main` ends the program, but only from `main`. To end the program from **anywhere**,
call `std::exit(code)` from `<cstdlib>`:

```cpp run
#include <cstdlib>
#include <iostream>

void checkPositive(int n) {
    if (n <= 0) {
        std::cout << "error: " << n << " is not positive, giving up\n";
        std::exit(EXIT_SUCCESS);   // stops the whole program (success code so this example "passes")
    }
}

int main() {
    checkPositive(5);
    std::cout << "5 is fine\n";
    checkPositive(-2);
    std::cout << "this line never runs\n";
}
```

```output
5 is fine
error: -2 is not positive, giving up
```

What `std::exit` does and doesn't do:

- It flushes and closes output streams and destroys **global and static** objects, then ends the
  process with the given exit code.
- It does **not** destroy local variables of the functions that are still running. For simple
  programs that's harmless; for objects that clean up after themselves (files, later), it can matter.
- It's declared `[[noreturn]]`, so the compiler knows code after it never runs.

Prefer returning from `main` when you can, and reserve `std::exit` for "can't continue" situations.
`std::abort()` is even more abrupt: no cleanup at all, and the exit status reports abnormal
termination. It's what a failed `assert` calls.

:::quiz
A program is run as `./tool -v input.txt`. What are `argc` and `argv[1]`?

- [ ] `argc` is 2, `argv[1]` is `"input.txt"`
- [x] `argc` is 3, `argv[1]` is `"-v"`
- [ ] `argc` is 3, `argv[1]` is `"./tool"`
- [ ] `argc` is 2, `argv[1]` is `"-v"`

`argv[0]` is the program name `./tool`, and `argc` counts it too.
:::

:::quiz
Which exit code conventionally means "success"?

- [x] `0`
- [ ] `1`
- [ ] `-1`
- [ ] any positive number

`0` (`EXIT_SUCCESS`) means success. Any non-zero value signals failure.
:::

:::exercise Simulated echo
The grader can't pass command-line arguments, so let's simulate them. Read words from standard
input until the end of input; treat them as the arguments `argv[1]`, `argv[2]`, ... of a program whose
`argv[0]` is `./app`. Print `argc` and then every `argv[i]`, **including** `argv[0]`.

**Input:** zero or more words.
**Output:** first `argc = N`, then one line per argument in the form `argv[i] = word`.

For input `hello world` the output is:

```
argc = 3
argv[0] = ./app
argv[1] = hello
argv[2] = world
```

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    while (std::cin >> word) {
        std::cout << word << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string all;
    int argc = 1;
    std::string word;
    while (std::cin >> word) {
        all += "argv[" + std::to_string(argc) + "] = " + word + "\n";
        ++argc;
    }
    std::cout << "argc = " << argc << '\n';
    std::cout << "argv[0] = ./app\n";
    std::cout << all;
}
```

```hint
`argc` starts at 1, because `argv[0]` (the program name) always counts.
```

```hint
You need to print `argc` *before* the words, but you only know it after reading them all. Build the
argument lines in a `std::string` first (`+=` appends, `std::to_string(n)` turns a number into text),
then print everything.
```

```stdin
hello world
```

```expected
argc = 3
argv[0] = ./app
argv[1] = hello
argv[2] = world
```

```stdin
```

```expected hidden
argc = 1
argv[0] = ./app
```

```stdin
-v --name=Ada file.txt
```

```expected hidden
argc = 4
argv[0] = ./app
argv[1] = -v
argv[2] = --name=Ada
argv[3] = file.txt
```
:::

:::exercise Status codes
Write `int validateAge(int age)` that returns `EXIT_SUCCESS` if `0 <= age <= 150` and `EXIT_FAILURE`
otherwise. Read ages until the end of input and print `AGE -> ok` or `AGE -> invalid` depending on the
returned status. Finally, print `failures: N` (the number of invalid ages) and return
`EXIT_SUCCESS` from `main` explicitly.

**Input:** zero or more integers.
**Output:** one line per age, then the `failures:` line.

```cpp starter
#include <cstdlib>
#include <iostream>

int main() {
    int age;
    while (std::cin >> age) {
        std::cout << age << " -> ok\n";
    }
}
```

```cpp solution
#include <cstdlib>
#include <iostream>

int validateAge(int age) {
    if (age < 0 || age > 150) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}

int main() {
    int failures = 0;
    int age;
    while (std::cin >> age) {
        if (validateAge(age) == EXIT_SUCCESS) {
            std::cout << age << " -> ok\n";
        } else {
            std::cout << age << " -> invalid\n";
            ++failures;
        }
    }
    std::cout << "failures: " << failures << '\n';
    return EXIT_SUCCESS;
}
```

```hint
Compare the result with the constant: `if (validateAge(age) == EXIT_SUCCESS)`.
```

```stdin
30 -1 150 151
```

```expected
30 -> ok
-1 -> invalid
150 -> ok
151 -> invalid
failures: 2
```

```stdin
```

```expected hidden
failures: 0
```

```checks
must EXIT_FAILURE :: Return EXIT_FAILURE for invalid ages.
must int\s+main[\s\S]*return\s+EXIT_SUCCESS\s*; :: End main with return EXIT_SUCCESS;
must int\s+validateAge\s*\(\s*int :: Write int validateAge(int age).
```
:::
