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

:::exercise Simulated echo {medium}
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
```stdin
a
b
c
d
e
f
g
h
i
j
```

```expected hidden
argc = 11
argv[0] = ./app
argv[1] = a
argv[2] = b
argv[3] = c
argv[4] = d
argv[5] = e
argv[6] = f
argv[7] = g
argv[8] = h
argv[9] = i
argv[10] = j
```

:::

:::exercise Status codes {easy}
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

```stdin
0 150 -150 1000
```

```expected hidden
0 -> ok
150 -> ok
-150 -> invalid
1000 -> invalid
failures: 2
```

```stdin
-1
```

```expected hidden
-1 -> invalid
failures: 1
```

```checks
must EXIT_FAILURE :: Return EXIT_FAILURE for invalid ages.
must int\s+main[\s\S]*return\s+EXIT_SUCCESS\s*; :: End main with return EXIT_SUCCESS;
must int\s+validateAge\s*\(\s*int :: Write int validateAge(int age).
```
:::

:::exercise Option parser {hard}
Real programs parse their command-line options. Simulate that: the words of the input are the
arguments `argv[1]`, `argv[2]`, ... of a program, and you parse them like a typical Unix tool.

**Rules**, applied to the words from left to right:

| Word | Meaning |
| --- | --- |
| `-v` or `--verbose` | turn verbose mode on |
| `-n` | the **next** word is the count: it must consist of 1 to 9 digits |
| `--name=VALUE` | set the name to `VALUE` (everything after the `=`, possibly empty) |
| `--` | stop parsing options: **every** later word is a file, even if it starts with `-` |
| `-` on its own | a file (by convention it means standard input) |
| any other word starting with `-` | an error: unknown option |
| anything else | a file |

**Output** on success, four lines (defaults: not verbose, count 1, no name, no files):

```
verbose: no
count: 1
name: (none)
files: (none)
```

`files:` lists the files separated by single spaces. On an error, print only the error message and stop:
`error: -n needs a number` (missing or not all digits) or `error: unknown option <word>`.

For `-v -n 3 --name=Ada notes.txt todo.txt`:

```
verbose: yes
count: 3
name: Ada
files: notes.txt todo.txt
```

Write the parsing in a function that returns an exit status (`EXIT_SUCCESS` or `EXIT_FAILURE`), but
have `main` itself always `return EXIT_SUCCESS;` so the grader sees exit code 0.

```cpp starter
#include <cstdlib>
#include <iostream>
#include <string>

int main() {
    std::string word;
    while (std::cin >> word) {
    }
    std::cout << "verbose: no\ncount: 1\nname: (none)\nfiles: (none)\n";
    return EXIT_SUCCESS;
}
```

```cpp solution
#include <cstdlib>
#include <iostream>
#include <string>

bool allDigits(const std::string& s) {
    if (s.empty() || s.size() > 9) {
        return false;
    }
    for (char c : s) {
        if (c < '0' || c > '9') {
            return false;
        }
    }
    return true;
}

int parseArguments() {
    bool verbose = false;
    int count = 1;
    std::string name = "(none)";
    std::string files;
    bool optionsDone = false;

    std::string word;
    while (std::cin >> word) {
        bool isOption = !optionsDone && word.size() > 1 && word[0] == '-';
        if (!isOption) {
            files += (files.empty() ? "" : " ") + word;
        } else if (word == "--") {
            optionsDone = true;
        } else if (word == "-v" || word == "--verbose") {
            verbose = true;
        } else if (word == "-n") {
            std::string value;
            if (!(std::cin >> value) || !allDigits(value)) {
                std::cout << "error: -n needs a number\n";
                return EXIT_FAILURE;
            }
            count = std::stoi(value);
        } else if (word.substr(0, 7) == "--name=") {
            name = word.substr(7);
        } else {
            std::cout << "error: unknown option " << word << '\n';
            return EXIT_FAILURE;
        }
    }

    std::cout << "verbose: " << (verbose ? "yes" : "no") << '\n';
    std::cout << "count: " << count << '\n';
    std::cout << "name: " << name << '\n';
    std::cout << "files: " << (files.empty() ? "(none)" : files) << '\n';
    return EXIT_SUCCESS;
}

int main() {
    int status = parseArguments();
    if (status != EXIT_SUCCESS) {
        std::cerr << "(a real program would now return " << status << ")\n";
    }
    return EXIT_SUCCESS;
}
```

```hint
Keep a `bool` that becomes true after `--`. While it's true, every word is a file.
```

```hint
`word.substr(0, 7) == "--name="` checks the beginning of a word (`substr(pos, len)` copies part of a
string), and `word.substr(7)` is everything after it. C++20 also has `word.starts_with("--name=")`.
```

```hint
For `-n`, read the next word and check that it's 1 to 9 digits **before** converting it with
`std::stoi`. The next word may also be missing.
```

```stdin
-v -n 3 --name=Ada notes.txt todo.txt
```

```expected
verbose: yes
count: 3
name: Ada
files: notes.txt todo.txt
```

```stdin
```

```expected
verbose: no
count: 1
name: (none)
files: (none)
```

```stdin
a.txt -- -v -n
```

```expected hidden
verbose: no
count: 1
name: (none)
files: a.txt -v -n
```

```stdin
-n
```

```expected hidden
error: -n needs a number
```

```stdin
-n 12x a.txt
```

```expected hidden
error: -n needs a number
```

```stdin
-q
```

```expected hidden
error: unknown option -q
```

```stdin
- --name= --verbose
```

```expected hidden
verbose: yes
count: 1
name:
files: -
```

```stdin
-n 007 -n 42 x -v y
```

```expected hidden
verbose: yes
count: 42
name: (none)
files: x y
```

```stdin
-n 1234567890
```

```expected hidden
error: -n needs a number
```

```stdin
--name=first --name=second -- --
```

```expected hidden
verbose: no
count: 1
name: second
files: --
```

```stdin
--count=3
```

```expected hidden
error: unknown option --count=3
```

```checks
must EXIT_FAILURE :: Return EXIT_FAILURE from your parsing function on errors.
must int\s+main[\s\S]*return\s+EXIT_SUCCESS\s*; :: main itself should return EXIT_SUCCESS.
```
:::
