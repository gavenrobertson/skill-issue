---
title: Destructors & RAII
summary: The destructor, exactly when it runs, the order objects are built and torn down, and RAII, the most important idiom in C++.
---

## The destructor

A constructor runs when an object is born. A **destructor** runs when it **dies**, and is the place to
clean up: free memory, close files, release locks, print a goodbye.

```cpp
class Widget {
public:
    Widget()  { /* acquire */ }
    ~Widget() { /* release */ }   // destructor: ~ + class name
};
```

Destructor rules:

- The name is `~` followed by the class name.
- **No parameters** and **no return type**, so there is exactly **one** destructor per class (it can't
  be overloaded).
- You never need to call it yourself. The compiler calls it automatically.
- If you don't write one, the compiler generates one that destroys each member.
- Destructors are implicitly `noexcept`: they must not throw exceptions.

```cpp run
#include <iostream>
#include <string>

class Noisy {
private:
    std::string name_;

public:
    explicit Noisy(const std::string& name) : name_(name) {
        std::cout << "  construct " << name_ << '\n';
    }
    ~Noisy() {
        std::cout << "  destroy   " << name_ << '\n';
    }
};

int main() {
    std::cout << "start of main\n";
    Noisy a("a");
    {
        std::cout << "enter block\n";
        Noisy b("b");
        std::cout << "leave block\n";
    }                                   // b dies here
    std::cout << "end of main\n";
}                                       // a dies here
```

```output
start of main
  construct a
enter block
  construct b
leave block
  destroy   b
end of main
  destroy   a
```

## When does a destructor run?

| Kind of object | Destructor runs... |
| --- | --- |
| Local (automatic) variable | when execution leaves its scope: the closing `}`, a `return`, a `break`, or an exception passing through |
| Object created with `new` | when you call `delete` on the pointer (never, if you forget!) |
| Temporary, e.g. `Noisy("t")` | at the end of the full expression (roughly, at the `;`) |
| Member of another object | right after the owner's destructor body runs |
| Element of a `std::vector` or array | when the container is destroyed (or the element is erased) |
| `static` or global object | after `main` returns |

The important property: for locals, **every** way out of a scope runs the destructor. Early returns,
loops that `break`, even exceptions. You cannot forget it.

```cpp run
#include <iostream>

class Guard {
    int id_;
public:
    explicit Guard(int id) : id_(id) { std::cout << "open " << id_ << '\n'; }
    ~Guard() { std::cout << "close " << id_ << '\n'; }
};

int find(int target) {
    for (int i = 1; i <= 3; ++i) {
        Guard g(i);
        if (i == target) {
            std::cout << "found " << i << '\n';
            return i;                     // g is still destroyed on the way out
        }
    }
    return -1;
}

int main() {
    find(2);

    Guard* p = new Guard(99);   // heap object: lives until delete
    std::cout << "between\n";
    delete p;                   // destructor runs now

    Guard(7);                   // temporary: destroyed at the end of this statement
    std::cout << "done\n";
}
```

```output
open 1
close 1
open 2
found 2
close 2
open 99
between
close 99
open 7
close 7
done
```

## Construction and destruction order

The rule is simple and always the same: **destruction happens in the exact reverse order of
construction**. Things built first are torn down last, like a stack of plates.

- Several locals in one scope: constructed top to bottom, destroyed bottom to top.
- An object with members: members are constructed **first** (in declaration order), then the
  constructor body runs. On destruction, the destructor body runs **first**, then members are destroyed
  in reverse declaration order. (So a destructor body can still use every member.)
- Elements of an array or `std::vector`: built first to last, destroyed last to first.

```cpp run
#include <iostream>
#include <string>

class Part {
    std::string name_;
public:
    explicit Part(const std::string& n) : name_(n) { std::cout << "  Part " << name_ << '\n'; }
    ~Part() { std::cout << "  ~Part " << name_ << '\n'; }
};

class Car {
    Part engine_{"engine"};     // declared first: built first, destroyed last
    Part wheels_{"wheels"};
public:
    Car() { std::cout << "  Car body\n"; }
    ~Car() { std::cout << "  ~Car body\n"; }
};

int main() {
    std::cout << "building:\n";
    {
        Car c;
        std::cout << "scrapping:\n";
    }
}
```

```output
building:
  Part engine
  Part wheels
  Car body
scrapping:
  ~Car body
  ~Part wheels
  ~Part engine
```

## RAII: Resource Acquisition Is Initialization

A **resource** is anything you must give back after using it: heap memory, an open file, a network
connection, a mutex lock, a database transaction. The classic C-style way is to pair every
"acquire" with a "release" by hand:

```cpp
void process() {
    int* data = new int[1000];
    FILE* f = std::fopen("data.txt", "r");
    if (!f) return;                  // LEAK: forgot delete[] data
    if (somethingFailed()) return;   // LEAK: forgot both
    work(data, f);                   // if this throws, LEAK
    std::fclose(f);
    delete[] data;
}
```

Every exit path is a chance to leak. **RAII** solves it with one idea:

> Tie the lifetime of a resource to the lifetime of an object. **Acquire it in the constructor,
> release it in the destructor.**

Because the compiler guarantees the destructor runs on every path out of a scope, the release can no
longer be forgotten. The name is awkward ("Resource Acquisition Is Initialization"); some people
prefer "Scope-Bound Resource Management". Here's a small RAII class that owns a heap array:

```cpp run
#include <iostream>
#include <cstddef>

class IntArray {
private:
    int* data_;
    std::size_t size_;

public:
    explicit IntArray(std::size_t size) : data_(new int[size]{}), size_(size) {
        std::cout << "allocated " << size_ << " ints\n";
    }
    ~IntArray() {
        delete[] data_;                  // release: runs on every exit path
        std::cout << "freed " << size_ << " ints\n";
    }

    // Copying would make two objects own the same memory (and free it twice).
    // We forbid it for now; the "Copy Semantics" lesson shows how to copy properly.
    IntArray(const IntArray&) = delete;
    IntArray& operator=(const IntArray&) = delete;

    int& at(std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

bool fillAndCheck(std::size_t n) {
    IntArray arr(n);
    for (std::size_t i = 0; i < arr.size(); ++i) arr.at(i) = static_cast<int>(i * i);
    if (arr.at(n - 1) > 10) {
        std::cout << "too big, bailing out early\n";
        return false;                    // no manual cleanup needed
    }
    return true;
}

int main() {
    fillAndCheck(3);
    fillAndCheck(5);
}
```

```output
allocated 3 ints
freed 3 ints
allocated 5 ints
too big, bailing out early
freed 5 ints
```

### You already use RAII everywhere

The standard library is built on RAII. Every one of these releases its resource in its destructor:

| Class | Resource it manages |
| --- | --- |
| `std::string`, `std::vector` | heap memory for the characters/elements |
| `std::unique_ptr`, `std::shared_ptr` | a heap object |
| `std::ifstream`, `std::ofstream` | an open file |
| `std::lock_guard`, `std::scoped_lock` | a locked mutex |
| `std::jthread` (C++20) | a running thread (joined on destruction) |

This is why idiomatic modern C++ almost never contains `delete`: you hold resources in objects that
clean up after themselves.

### Why RAII is *the* C++ idiom

- **No leaks:** cleanup can't be forgotten, even on early return.
- **Exception safety:** when an exception unwinds the stack, every local's destructor runs, so
  resources are released (the Exceptions module builds on this).
- **Deterministic:** unlike garbage-collected languages, you know *exactly* when cleanup happens:
  at the closing brace. Files get closed and locks released immediately, not "eventually".
- **Composable:** a class whose members are RAII types needs no destructor of its own. The members
  clean themselves up.

## Common mistakes

**Calling the destructor yourself.** `obj.~Widget();` on a local makes it run *twice* (once by you, once
at scope exit), which is undefined behavior. Let the compiler do it.

**Mismatching `new[]` and `delete`.** Memory from `new T[n]` must be freed with `delete[]`; memory from
`new T` with plain `delete`. Mixing them is undefined behavior.

**Throwing from a destructor.** Destructors are `noexcept`; if one throws, the program terminates.

**Writing a destructor but forgetting about copies.** If your class frees a resource in its destructor,
the compiler-generated copy will copy the *pointer*, and both objects will free it. Either delete the
copy operations (as `IntArray` does) or implement them (later in this module).

**Destructor with parameters.** Not allowed:

```cpp compile-error
class File {
public:
    ~File(bool flush) {}   // error: destructors may not have parameters
};

int main() {}
```

:::quiz
What does this print?

```cpp
struct T {
    char c;
    T(char ch) : c(ch) { std::cout << c; }
    ~T() { std::cout << c; }
};
int main() {
    T a('1');
    T b('2');
    { T c('3'); }
}
```

- [x] `123321`
- [ ] `123123`
- [ ] `123312`
- [ ] `12321`

Locals are built top to bottom and destroyed in reverse. `c` lives only in the inner block, so it is
built and destroyed (`33`) before `a` and `b`. Then `b` dies, then `a`: the full output is `123321`.
:::

:::quiz
Which statements about destructors are true? (select all that apply)

- [x] A class has exactly one destructor
- [x] A local object's destructor runs even if the function returns early
- [ ] You must call the destructor yourself before an object goes out of scope
- [ ] A destructor can take parameters to choose how to clean up

There's one destructor, with no parameters, called automatically on every exit from the scope.
:::

:::exercise Hello and goodbye
Complete the `Greeter` class:

- The constructor takes a name and prints `Hello, NAME!`
- The destructor prints `Goodbye, NAME!`

`main` (already written) reads three names and creates one `Greeter` per name, in that order, in the
same scope. Think about the order of the goodbyes!

**Input:** three names separated by spaces.
**Output:** three `Hello` lines in input order, then three `Goodbye` lines.

```cpp starter
#include <iostream>
#include <string>

class Greeter {
private:
    std::string name_;

public:
    explicit Greeter(const std::string& name) : name_(name) {
        // print the greeting
    }
    // add the destructor
};

int main() {
    std::string a, b, c;
    std::cin >> a >> b >> c;
    Greeter first(a);
    Greeter second(b);
    Greeter third(c);
}
```

```cpp solution
#include <iostream>
#include <string>

class Greeter {
private:
    std::string name_;

public:
    explicit Greeter(const std::string& name) : name_(name) {
        std::cout << "Hello, " << name_ << "!\n";
    }
    ~Greeter() {
        std::cout << "Goodbye, " << name_ << "!\n";
    }
};

int main() {
    std::string a, b, c;
    std::cin >> a >> b >> c;
    Greeter first(a);
    Greeter second(b);
    Greeter third(c);
}
```

```hint
The destructor is written `~Greeter() { ... }`.
```

```hint
Objects are destroyed in reverse order of construction, so the goodbyes come out last-to-first automatically.
```

```stdin
Ann Bob Cy
```

```expected
Hello, Ann!
Hello, Bob!
Hello, Cy!
Goodbye, Cy!
Goodbye, Bob!
Goodbye, Ann!
```

```stdin
x x y
```

```expected hidden
Hello, x!
Hello, x!
Hello, y!
Goodbye, y!
Goodbye, x!
Goodbye, x!
```

```checks
must ~Greeter\s*\(\s*\) :: Write a destructor ~Greeter().
```
:::

:::exercise Balanced tags
Write an RAII class `Tag` whose constructor prints an opening tag `<name>` and whose destructor prints
the closing tag `</name>`. Nothing else prints a newline until the end.

The given `nest` function creates one `Tag` per word and then recurses, so each tag closes only after
everything nested inside it has closed.

**Input:** a count `n` (at least 1), then `n` words.
**Output:** the nested tags on one line. For `3 a b c` the output is `<a><b><c></c></b></a>`.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

class Tag {
    // TODO: store the name, print in the constructor and destructor
public:
    explicit Tag(const std::string&) {}
};

void nest(const std::vector<std::string>& words, std::size_t i) {
    if (i == words.size()) return;
    Tag t(words[i]);
    nest(words, i + 1);
}

int main() {
    int n;
    std::cin >> n;
    std::vector<std::string> words(n);
    for (auto& w : words) std::cin >> w;
    nest(words, 0);
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

class Tag {
    std::string name_;
public:
    explicit Tag(const std::string& name) : name_(name) {
        std::cout << '<' << name_ << '>';
    }
    ~Tag() {
        std::cout << "</" << name_ << '>';
    }
};

void nest(const std::vector<std::string>& words, std::size_t i) {
    if (i == words.size()) return;
    Tag t(words[i]);
    nest(words, i + 1);
}

int main() {
    int n;
    std::cin >> n;
    std::vector<std::string> words(n);
    for (auto& w : words) std::cin >> w;
    nest(words, 0);
    std::cout << '\n';
}
```

```hint
Store the name in a `std::string name_` member so the destructor can print it.
```

```stdin
3
a b c
```

```expected
<a><b><c></c></b></a>
```

```stdin
1
html
```

```expected hidden
<html></html>
```

```stdin
4
html body div p
```

```expected hidden
<html><body><div><p></p></div></body></html>
```

```checks
must ~Tag\s*\(\s*\) :: Print the closing tag from the destructor ~Tag().
```
:::

:::exercise Owning buffer
Write an RAII class `Buffer` that owns a heap array of `int`:

- `explicit Buffer(int n)`: allocates `n` ints with `new int[n]` and stores the size.
- `~Buffer()`: frees the array with `delete[]`.
- Copying must be forbidden: `= delete` the copy constructor and copy assignment.
- `int& at(int i)` returns a reference to element `i`, and `int size() const` returns the size.

`main` reads the numbers into the buffer and prints their **sum** and **maximum**.

**Input:** `n` (at least 1), then `n` integers.
**Output:** `sum max` on one line.

```cpp starter
#include <iostream>

class Buffer {
    // TODO
public:
    explicit Buffer(int) {}
    int& at(int) { static int dummy = 0; return dummy; }
    int size() const { return 0; }
};

int main() {
    int n;
    std::cin >> n;
    Buffer buf(n);
    for (int i = 0; i < buf.size(); ++i) std::cin >> buf.at(i);

    long long sum = 0;
    int best = buf.size() > 0 ? buf.at(0) : 0;
    for (int i = 0; i < buf.size(); ++i) {
        sum += buf.at(i);
        if (buf.at(i) > best) best = buf.at(i);
    }
    std::cout << sum << ' ' << best << '\n';
}
```

```cpp solution
#include <iostream>

class Buffer {
    int* data_;
    int size_;
public:
    explicit Buffer(int n) : data_(new int[n]{}), size_(n) {}
    ~Buffer() { delete[] data_; }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    int& at(int i) { return data_[i]; }
    int size() const { return size_; }
};

int main() {
    int n;
    std::cin >> n;
    Buffer buf(n);
    for (int i = 0; i < buf.size(); ++i) std::cin >> buf.at(i);

    long long sum = 0;
    int best = buf.size() > 0 ? buf.at(0) : 0;
    for (int i = 0; i < buf.size(); ++i) {
        sum += buf.at(i);
        if (buf.at(i) > best) best = buf.at(i);
    }
    std::cout << sum << ' ' << best << '\n';
}
```

```hint
Members: `int* data_;` and `int size_;`. Constructor: `: data_(new int[n]{}), size_(n) {}`.
```

```hint
`Buffer(const Buffer&) = delete;` and `Buffer& operator=(const Buffer&) = delete;` forbid copying.
```

```stdin
4
3 9 -2 5
```

```expected
15 9
```

```stdin
3
-7 -3 -10
```

```expected hidden
-20 -3
```

```stdin
1
0
```

```expected hidden
0 0
```

```checks
must new\s+int\s*\[ :: Allocate the array with new int[n].
must delete\s*\[\s*\] :: Free the array with delete[] in the destructor.
must ~Buffer\s*\( :: Write a destructor.
must Buffer\s*\(\s*const\s+Buffer\s*&\s*\)\s*=\s*delete :: Delete the copy constructor.
```
:::
