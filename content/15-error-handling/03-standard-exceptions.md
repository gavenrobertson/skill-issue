---
title: Standard Exceptions
summary: The std::exception hierarchy, what logic_error and runtime_error mean, what() and its messages, and which standard library functions throw what.
---

## One family of exception types

The standard library throws objects of classes that all derive from **`std::exception`** (in
`<exception>`). That gives everyone a common way to catch them and get a message:

```cpp
class exception {
public:
    virtual const char* what() const noexcept;   // a description of the error
    virtual ~exception();
    // ...
};
```

Because `what()` is **virtual**, catching `const std::exception&` and calling `what()` gives you the
message of whatever *derived* exception was actually thrown.

## The hierarchy

```
std::exception                          <exception>
├── std::logic_error                    <stdexcept>
│   ├── std::invalid_argument
│   ├── std::domain_error
│   ├── std::length_error
│   └── std::out_of_range
├── std::runtime_error                  <stdexcept>
│   ├── std::range_error
│   ├── std::overflow_error
│   ├── std::underflow_error
│   └── std::system_error               <system_error>
│       └── std::ios_base::failure      <ios>
├── std::bad_alloc                      <new>
│   └── std::bad_array_new_length
├── std::bad_cast                       <typeinfo>
├── std::bad_typeid                     <typeinfo>
├── std::bad_optional_access            <optional>
├── std::bad_variant_access             <variant>
├── std::bad_function_call              <functional>
└── std::bad_weak_ptr                   <memory>
```

### `logic_error`: the program is wrong

A **`std::logic_error`** reports a mistake that, in principle, could have been detected **before**
the call by checking the arguments: a violated precondition.

| Type | Meaning | Example |
| --- | --- | --- |
| `std::invalid_argument` | an argument has an unacceptable value | `std::stoi("hello")` |
| `std::domain_error` | input outside the domain where an operation is defined | your own `sqrt` of a negative number |
| `std::length_error` | trying to exceed a maximum allowed size | `v.reserve(v.max_size() + 1)` |
| `std::out_of_range` | an index or key outside the valid range | `v.at(100)`, `m.at("missing")` |

### `runtime_error`: the world is wrong

A **`std::runtime_error`** reports a problem that could only be detected while running, outside the
program's control: bad data, a failed system call, a result that doesn't fit.

| Type | Meaning |
| --- | --- |
| `std::runtime_error` | a general runtime failure (the usual base for your own errors) |
| `std::overflow_error` | an arithmetic result too large to represent |
| `std::underflow_error` | an arithmetic result too small to represent |
| `std::range_error` | a result that can't be represented in the destination type |
| `std::system_error` | an operating-system error, with an `error_code` (files, threads) |

In practice the line between the two is blurry, and the standard library itself throws few of the
`runtime_error` subtypes. What matters most: pick a reasonable type when **you** throw, and catch
by the most useful base when you handle.

### The others

- **`std::bad_alloc`**: `new` couldn't get memory. Every container can throw it when it grows.
- **`std::bad_cast`**: a `dynamic_cast` to a **reference** type failed (with a pointer it returns
  `nullptr` instead).
- **`std::bad_optional_access`**: `.value()` on an empty `std::optional`.
- **`std::bad_variant_access`**: `std::get<T>` on a `std::variant` that holds a different type.
- **`std::bad_function_call`**: calling an empty `std::function`.

## Throwing standard exceptions yourself

`std::logic_error`, `std::runtime_error` and their subclasses take a message (a `std::string` or a
C-string) in their constructor, and **`what()` returns exactly that message**:

```cpp run
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <string>

double checked_sqrt(double x) {
    if (x < 0) throw std::domain_error("sqrt of negative number: " + std::to_string(x));
    return std::sqrt(x);
}

int main() {
    try {
        std::cout << checked_sqrt(16) << '\n';
        std::cout << checked_sqrt(-1) << '\n';
    } catch (const std::domain_error& e) {
        std::cout << "domain_error: " << e.what() << '\n';
    }
}
```

```output
4
domain_error: sqrt of negative number: -1.000000
```

`std::exception` itself has no constructor taking a message, and neither do `bad_alloc`,
`bad_cast` and friends. Throw `std::runtime_error` (or a more specific type) instead:

```cpp compile-error
#include <exception>

int main() {
    throw std::exception("nope");   // error: no matching constructor (that's an MSVC extension)
}
```

## What the library throws

Here are the common throwing functions, each caught by its exact type:

```cpp run
#include <functional>
#include <iostream>
#include <map>
#include <optional>
#include <stdexcept>
#include <string>
#include <variant>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    try {
        std::cout << v.at(10);                          // at() checks the index; v[10] would be UB
    } catch (const std::out_of_range&) {
        std::cout << "vector::at -> out_of_range\n";
    }

    std::map<std::string, int> ages{{"ada", 36}};
    try {
        std::cout << ages.at("bob");                    // at() never inserts; operator[] would
    } catch (const std::out_of_range&) {
        std::cout << "map::at -> out_of_range\n";
    }

    std::string s = "short";
    try {
        std::cout << s.substr(10);                      // start position past the end
    } catch (const std::out_of_range&) {
        std::cout << "string::substr -> out_of_range\n";
    }

    try {
        std::cout << std::stoi("hello");                // no digits at all
    } catch (const std::invalid_argument&) {
        std::cout << "stoi(\"hello\") -> invalid_argument\n";
    }

    try {
        std::cout << std::stoi("99999999999");          // doesn't fit in an int
    } catch (const std::out_of_range&) {
        std::cout << "stoi(\"99999999999\") -> out_of_range\n";
    }

    try {
        v.reserve(v.max_size() + 1);
    } catch (const std::length_error&) {
        std::cout << "vector::reserve -> length_error\n";
    }

    std::optional<int> empty;
    try {
        std::cout << empty.value();
    } catch (const std::bad_optional_access&) {
        std::cout << "optional::value -> bad_optional_access\n";
    }

    std::variant<int, std::string> var = std::string("text");
    try {
        std::cout << std::get<int>(var);
    } catch (const std::bad_variant_access&) {
        std::cout << "std::get -> bad_variant_access\n";
    }

    std::function<void()> nothing;
    try {
        nothing();
    } catch (const std::bad_function_call&) {
        std::cout << "empty std::function -> bad_function_call\n";
    }
}
```

```output
vector::at -> out_of_range
map::at -> out_of_range
string::substr -> out_of_range
stoi("hello") -> invalid_argument
stoi("99999999999") -> out_of_range
vector::reserve -> length_error
optional::value -> bad_optional_access
std::get -> bad_variant_access
empty std::function -> bad_function_call
```

And two more that are hard to demonstrate safely:

```cpp
// new throws std::bad_alloc when memory runs out:
try {
    auto huge = std::make_unique<char[]>(1'000'000'000'000);   // ~1 TB: most machines will refuse
} catch (const std::bad_alloc&) {
    std::cout << "out of memory\n";
}

// dynamic_cast to a reference throws std::bad_cast when the object has the wrong type:
Base& b = some_base_object;
try {
    Derived& d = dynamic_cast<Derived&>(b);
} catch (const std::bad_cast&) { ... }
```

> **Note:** The text returned by `what()` for exceptions thrown **by the library** is not
> standardized. `v.at(10)` on GCC says something like
> `vector::_M_range_check: __n (which is 10) >= this->size() (which is 3)`, while other compilers say
> something else. Show it to developers (logs), but don't make program logic depend on it, and
> write your own text for end users.

### `std::stoi` and friends in detail

`std::stoi`, `std::stol`, `std::stoll`, `std::stoul`, `std::stof`, `std::stod` (in `<string>`)
convert text to numbers. They skip leading whitespace, accept an optional sign, and then read as
many characters as form a number. They **stop at the first character that doesn't fit**, and only
throw if **no** characters could be converted. An optional second argument receives how many
characters were used, so you can detect trailing garbage:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::cout << std::stoi("42") << ' ' << std::stoi("  -7") << ' ' << std::stoi("12abc") << '\n';

    std::size_t used = 0;
    int n = std::stoi("12abc", &used);
    std::cout << n << " used " << used << " chars\n";      // 2: "abc" was ignored!

    std::cout << std::stoi("ff", nullptr, 16) << '\n';       // third argument: the base
}
```

```output
42 -7 12
12 used 2 chars
255
```

## Catching by base class

Catching a base class catches **every** class derived from it. Use that to handle a whole category
at once:

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

void attempt(int which) {
    std::vector<int> v{1, 2, 3};
    if (which == 0) std::cout << v.at(5);                  // out_of_range   (a logic_error)
    if (which == 1) std::cout << std::stoi("x");           // invalid_argument (a logic_error)
    if (which == 2) throw std::overflow_error("too big");  // a runtime_error
    if (which == 3) throw std::bad_alloc();                // neither
}

int main() {
    for (int i = 0; i < 4; ++i) {
        try {
            attempt(i);
        } catch (const std::logic_error&) {
            std::cout << i << ": a bug in the input or the caller\n";
        } catch (const std::runtime_error& e) {
            std::cout << i << ": runtime problem: " << e.what() << '\n';
        } catch (const std::exception&) {
            std::cout << i << ": some other standard exception\n";
        }
    }
}
```

```output
0: a bug in the input or the caller
1: a bug in the input or the caller
2: runtime problem: too big
3: some other standard exception
```

A common structure for `main` is a last line of defense:

```cpp
int main() {
    try {
        run_program();
    } catch (const std::exception& e) {
        std::cerr << "fatal: " << e.what() << '\n';
        return 1;
    } catch (...) {
        std::cerr << "fatal: unknown error\n";
        return 1;
    }
}
```

## Checked vs. unchecked access

Many standard containers offer both:

| Unchecked (fast, UB on bad index) | Checked (throws `std::out_of_range`) |
| --- | --- |
| `v[i]` | `v.at(i)` |
| `s[i]` | `s.at(i)` |
| `m[key]` (inserts a default value if missing!) | `m.at(key)` |
| `*opt` | `opt.value()` (throws `bad_optional_access`) |

Use the checked versions when an index or key comes from outside your control (user input, files),
or while you're still debugging. Use the unchecked ones when you **know** the index is valid,
e.g. in a loop from `0` to `size()`.

:::quiz
Which of these derive from `std::logic_error`? (select all that apply)

- [x] `std::out_of_range`
- [x] `std::invalid_argument`
- [ ] `std::overflow_error`
- [ ] `std::bad_alloc`

`out_of_range`, `invalid_argument`, `domain_error` and `length_error` are logic errors. `overflow_error` is a `runtime_error`, and `bad_alloc` derives directly from `std::exception`.
:::

:::quiz
What does `std::stoi("3.99")` return?

- [ ] `4`
- [x] `3`
- [ ] It throws `std::invalid_argument`
- [ ] It throws `std::out_of_range`

`stoi` reads as many characters as form an integer (`3`) and stops at the `.`. It only throws when nothing at all could be converted, or the number doesn't fit.
:::

:::exercise Safe index {easy}
Read `n` integers into a `std::vector<int>`, then `q` queries, each an index (possibly negative or too
large). For each query, print the element using **`.at()`**, or `out of range` when `.at()` throws.

**Input:** `n`, `n` integers, `q`, then `q` integers (the indexes).
**Output:** one line per query: the element, or `out of range`.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    int q;
    std::cin >> q;
    while (q--) {
        long long i;
        std::cin >> i;
        std::cout << "out of range\n";
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    int q;
    std::cin >> q;
    while (q--) {
        long long i;
        std::cin >> i;
        try {
            int value = v.at(static_cast<std::size_t>(i));
            std::cout << value << '\n';
        } catch (const std::out_of_range&) {
            std::cout << "out of range\n";
        }
    }
}
```

```hint
`v.at(index)` throws `std::out_of_range` for any index `>= v.size()`. Wrap it in `try` and catch that type.
```

```hint
`.at()` takes a `std::size_t`. Converting a negative number to `std::size_t` gives a huge value, which
`.at()` then rejects, so `static_cast<std::size_t>(i)` handles negatives too.
```

```stdin
3
10 20 30
4
0
2
3
-1
```

```expected
10
30
out of range
out of range
```

```stdin
0
2
0
5
```

```expected hidden
out of range
out of range
```

```stdin
2
7 8
5
1
-2
2
99999999999
0
```

```expected hidden
8
out of range
out of range
out of range
7
```

```checks
must \.at\s*\( :: Access elements with .at().
must catch\s*\(\s*const\s+std::(out_of_range|logic_error|exception)\s*& :: Catch std::out_of_range by const reference.
mustnot \bif\s*\([^)]*size\s*\( :: Let .at() do the bounds check instead of comparing with size() yourself.
```
:::

:::exercise Strict integer parsing {medium}
Read tokens until the end of input and convert each with `std::stoi`. A token counts as an integer
only if **all** of it was converted (use `stoi`'s second argument to find out how many characters it
used).

**Input:** whitespace-separated tokens.
**Output:** one line per token:

- `ok N` for a valid integer (print the converted value),
- `not a number: TOKEN` if `std::stoi` throws `std::invalid_argument`, or if there are characters
  left over (like `12abc`),
- `too big: TOKEN` if `std::stoi` throws `std::out_of_range`.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <string>

int main() {
    std::string token;
    while (std::cin >> token) {
        int n = std::stoi(token);
        std::cout << "ok " << n << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <string>

int main() {
    std::string token;
    while (std::cin >> token) {
        try {
            std::size_t used = 0;
            int n = std::stoi(token, &used);
            if (used != token.size()) throw std::invalid_argument("trailing characters");
            std::cout << "ok " << n << '\n';
        } catch (const std::invalid_argument&) {
            std::cout << "not a number: " << token << '\n';
        } catch (const std::out_of_range&) {
            std::cout << "too big: " << token << '\n';
        }
    }
}
```

```hint
`std::size_t used = 0; int n = std::stoi(token, &used);`: afterwards, `used` is the number of characters converted.
```

```hint
If `used != token.size()`, you can `throw std::invalid_argument(...)` yourself, so that it lands in the
same handler as the library's own `invalid_argument`.
```

```stdin
42 -17 abc 12abc 99999999999
```

```expected
ok 42
ok -17
not a number: abc
not a number: 12abc
too big: 99999999999
```

```stdin
+5 0 3.5 -2147483648 2147483648
```

```expected hidden
ok 5
ok 0
not a number: 3.5
ok -2147483648
too big: 2147483648
```

```stdin
- + 0x1A 007 -0 1e5 -99999999999 12-
```

```expected hidden
not a number: -
not a number: +
not a number: 0x1A
ok 7
ok 0
not a number: 1e5
too big: -99999999999
not a number: 12-
```

```checks
must stoi :: Convert with std::stoi.
must catch\s*\(\s*const\s+std::invalid_argument\s*& :: Catch std::invalid_argument.
must catch\s*\(\s*const\s+std::out_of_range\s*& :: Catch std::out_of_range.
```
:::

:::exercise Phone book {easy}
Read `n` entries `name number` into a `std::map<std::string, std::string>`. Then read names until the
end of input and look each one up with **`.at()`** (which throws `std::out_of_range` for a missing key),
printing `name: number` or `unknown: name`.

**Input:** `n`, then `n` lines `name number`, then any number of names to look up.
**Output:** one line per lookup.

```cpp starter
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

int main() {
    int n;
    std::cin >> n;
    std::map<std::string, std::string> book;
    for (int i = 0; i < n; ++i) {
        std::string name, number;
        std::cin >> name >> number;
        book[name] = number;
    }

    std::string name;
    while (std::cin >> name) {
        std::cout << name << ": " << book[name] << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>

int main() {
    int n;
    std::cin >> n;
    std::map<std::string, std::string> book;
    for (int i = 0; i < n; ++i) {
        std::string name, number;
        std::cin >> name >> number;
        book[name] = number;
    }

    std::string name;
    while (std::cin >> name) {
        try {
            const std::string& number = book.at(name);
            std::cout << name << ": " << number << '\n';
        } catch (const std::out_of_range&) {
            std::cout << "unknown: " << name << '\n';
        }
    }
}
```

```hint
`book[name]` silently **inserts** an empty entry for a missing name. `book.at(name)` throws
`std::out_of_range` instead.
```

```hint
Look the number up first, then print, so nothing is printed for a missing name before the exception.
```

```stdin
2
ada 555-0101
alan 555-0199
alan
grace
ada
```

```expected
alan: 555-0199
unknown: grace
ada: 555-0101
```

```stdin
0
nobody
```

```expected hidden
unknown: nobody
```

```stdin
3
ada 111
bob 222
ada 333
ada
Ada
bob
```

```expected hidden
ada: 333
unknown: Ada
bob: 222
```

```checks
must \.at\s*\( :: Look names up with .at().
must \bcatch\s*\( :: Catch the exception that .at() throws.
mustnot \.find\s*\(|\.count\s*\(|\.contains\s*\( :: Practice exceptions here: don't check with find/count/contains.
```
:::

:::exercise Classify the failure {medium}
A tiny command interpreter. Each command may fail by throwing a standard exception, and `main`
classifies failures with **two handlers**: one for `std::logic_error` and one for `std::runtime_error`.

| Command | Action | On failure |
| --- | --- | --- |
| `index I` | print `data.at(I)` where `data` is `{10, 20, 30}` | `.at()` throws `std::out_of_range` |
| `parse S` | print `std::stoi(S)` | `stoi` throws `std::invalid_argument` / `std::out_of_range` |
| `root X` | print the integer square root of `X` | throw `std::domain_error` if `X < 0` |
| `div A B` | print `A / B` | throw `std::overflow_error` if `B == 0` |
| anything else (with one argument) | | throw `std::invalid_argument` |

**Input:** lines of `command argument(s)`; `div` takes two integers, the others one token.
**Output:** for each command, its result, or `logic error in CMD` / `runtime error in CMD`, where `CMD`
is the command word.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

long long run(const std::string& cmd) {
    const std::vector<long long> data{10, 20, 30};
    if (cmd == "index") {
        long long i;
        std::cin >> i;
        return data.at(static_cast<std::size_t>(i));
    }
    std::string skip;
    std::cin >> skip;
    return 0;
}

int main() {
    std::string cmd;
    while (std::cin >> cmd) {
        long long result = run(cmd);
        std::cout << result << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

long long run(const std::string& cmd) {
    const std::vector<long long> data{10, 20, 30};
    if (cmd == "index") {
        long long i;
        std::cin >> i;
        return data.at(static_cast<std::size_t>(i));
    }
    if (cmd == "parse") {
        std::string s;
        std::cin >> s;
        return std::stoi(s);
    }
    if (cmd == "root") {
        long long x;
        std::cin >> x;
        if (x < 0) throw std::domain_error("negative root");
        long long r = 0;
        while ((r + 1) * (r + 1) <= x) ++r;
        return r;
    }
    if (cmd == "div") {
        long long a, b;
        std::cin >> a >> b;
        if (b == 0) throw std::overflow_error("division by zero");
        return a / b;
    }
    std::string skip;
    std::cin >> skip;
    throw std::invalid_argument("unknown command");
}

int main() {
    std::string cmd;
    while (std::cin >> cmd) {
        try {
            long long result = run(cmd);
            std::cout << result << '\n';
        } catch (const std::logic_error&) {
            std::cout << "logic error in " << cmd << '\n';
        } catch (const std::runtime_error&) {
            std::cout << "runtime error in " << cmd << '\n';
        }
    }
}
```

```hint
Read each command's arguments **before** anything can throw, so a failed command doesn't leave its
argument behind in the input.
```

```hint
`std::out_of_range`, `std::invalid_argument` and `std::domain_error` all derive from `std::logic_error`;
`std::overflow_error` derives from `std::runtime_error`. So two handlers cover everything.
```

```stdin
index 1
index 5
parse 77
parse seven
root 50
root -9
div 7 2
div 7 0
jump 3
```

```expected
20
logic error in index
77
logic error in parse
7
logic error in root
3
runtime error in div
logic error in jump
```

```stdin
parse 99999999999
index -1
div -9 3
```

```expected hidden
logic error in parse
logic error in index
-3
```

```stdin
parse 12abc
root 0
div 5 -0
index 2
frobnicate x
parse -
root 99
```

```expected hidden
12
0
runtime error in div
30
logic error in frobnicate
logic error in parse
9
```

```checks
must catch\s*\(\s*const\s+std::logic_error\s*& :: Catch std::logic_error by const reference.
must catch\s*\(\s*const\s+std::runtime_error\s*& :: Catch std::runtime_error by const reference.
must domain_error :: Throw std::domain_error for a negative root.
must overflow_error :: Throw std::overflow_error for division by zero.
```
:::
