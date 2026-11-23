---
title: Class Templates
summary: Generic types like Box<T> and Stack<T>, member functions inside and outside the class, CTAD, default template arguments and template aliases.
---

## Why class templates?

You've already used class templates constantly: `std::vector<int>`, `std::vector<std::string>`,
`std::pair<int, double>`. One definition of `vector`, any element type. Now you'll write your own.

A **class template** is a recipe for classes, just as a function template is a recipe for functions.

## Defining one: `Box<T>`

```cpp run
#include <iostream>
#include <string>

template <typename T>
class Box {
public:
    explicit Box(T value) : value_(value) {}

    const T& get() const { return value_; }
    void set(const T& value) { value_ = value; }

private:
    T value_;
};

int main() {
    Box<int> a(42);
    Box<std::string> b("hello");

    a.set(a.get() + 1);
    std::cout << a.get() << ' ' << b.get() << '\n';
}
```

```output
43 hello
```

- `template <typename T>` goes right before `class` (or `struct`).
- Inside the class, `T` is used like any type: for members, parameters and return types.
- To use it, you write the **template arguments** in angle brackets: `Box<int>`, `Box<std::string>`.

`Box` on its own is not a type; it's a template. `Box<int>` is a type. And `Box<int>` and
`Box<double>` are **completely unrelated types**, as different as `int` and `std::string`:

```cpp compile-error
template <typename T>
struct Box { T value; };

int main() {
    Box<int> a{1};
    Box<double> b{2.0};
    b = a;    // error: no match for 'operator=' (operand types are 'Box<double>' and 'Box<int>')
}
```

Inside the class body, you may write just `Box` to mean "this `Box<T>`" (it's called the
*injected class name*). Outside, you need the full `Box<T>`.

## A real example: `Stack<T>`

A stack lets you push values on top and pop them off in reverse order. Store the elements in a
`std::vector<T>`:

```cpp run
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& value) { items_.push_back(value); }

    void pop() {
        if (items_.empty()) throw std::out_of_range("pop on empty stack");
        items_.pop_back();
    }

    const T& top() const { return items_.back(); }
    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }

private:
    std::vector<T> items_;
};

int main() {
    Stack<int> numbers;
    for (int i = 1; i <= 3; ++i) numbers.push(i * 10);

    while (!numbers.empty()) {
        std::cout << numbers.top() << ' ';
        numbers.pop();
    }
    std::cout << '\n';

    Stack<std::string> words;
    words.push("first");
    words.push("second");
    std::cout << words.top() << " (size " << words.size() << ")\n";
}
```

```output
30 20 10
second (size 2)
```

## Member functions outside the class

For longer functions you may want to declare them in the class and define them after it. The definition
needs **its own template header**, and the class name needs its template arguments:

```cpp run
#include <iostream>
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& value);
    T popValue();
    bool empty() const;

private:
    std::vector<T> items_;
};

template <typename T>
void Stack<T>::push(const T& value) {
    items_.push_back(value);
}

template <typename T>
T Stack<T>::popValue() {
    T top = items_.back();
    items_.pop_back();
    return top;
}

template <typename T>
bool Stack<T>::empty() const {
    return items_.empty();
}

int main() {
    Stack<char> s;
    for (char c : {'a', 'b', 'c'}) s.push(c);
    while (!s.empty()) std::cout << s.popValue();
    std::cout << '\n';
}
```

```output
cba
```

Read `template <typename T> void Stack<T>::push(const T& value)` as: "for every type `T`, here is the
`push` member of `Stack<T>`". Forgetting either part is a common error:

```cpp compile-error
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& value);
private:
    std::vector<T> items_;
};

void Stack::push(const T& value) {   // error: 'template<class T> class Stack' used without template arguments
    items_.push_back(value);
}

int main() {}
```

Just like function templates, these out-of-class definitions still belong in the **header**, not in a
`.cpp` file.

Member functions of a class template are only instantiated if they're **used**. A `Stack<Widget>` where
`Widget` can't be printed is fine, as long as you never call a member that prints.

## Class Template Argument Deduction (CTAD, C++17)

Before C++17 you always had to spell out the arguments: `std::pair<int, double> p(1, 2.5);`. Since C++17
the compiler can **deduce** them from the constructor arguments:

```cpp run
#include <iostream>
#include <string>
#include <utility>
#include <vector>

template <typename T>
class Box {
public:
    explicit Box(T value) : value_(value) {}
    const T& get() const { return value_; }
private:
    T value_;
};

int main() {
    Box a(42);                         // Box<int>
    Box b(2.5);                        // Box<double>
    Box c(std::string("text"));        // Box<std::string>
    std::pair p(1, 'x');               // std::pair<int, char>
    std::vector v{1, 2, 3};            // std::vector<int>

    std::cout << a.get() << ' ' << b.get() << ' ' << c.get() << '\n';
    std::cout << p.first << p.second << ' ' << v.size() << '\n';
}
```

```output
42 2.5 text
1x 3
```

Careful with string literals: `Box d("text");` deduces `Box<const char*>`, not `Box<std::string>`.

CTAD only works when there's something to deduce from. A default-constructed `Stack s;` has no
arguments, so the compiler can't know `T`:

```cpp compile-error
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& v) { items_.push_back(v); }
private:
    std::vector<T> items_;
};

int main() {
    Stack s;      // error: class template argument deduction failed
    s.push(1);    // (the compiler does NOT look at later uses)
}
```

## Default template arguments

Template parameters can have defaults, just like function parameters. Defaults must come at the end:

```cpp run
#include <iostream>
#include <string>

template <typename T = int, typename Label = std::string>
struct Counter {
    Label name;
    T count{};

    void add(T amount) { count += amount; }
};

int main() {
    Counter<> clicks{"clicks"};            // T = int, Label = std::string
    Counter<double> distance{"km"};        // Label still defaults to std::string
    clicks.add(2);
    clicks.add(3);
    distance.add(1.5);
    std::cout << clicks.name << ": " << clicks.count << '\n';
    std::cout << distance.name << ": " << distance.count << '\n';
}
```

```output
clicks: 5
km: 1.5
```

`Counter<>` means "all defaults". The standard library uses this everywhere: `std::vector<T>` is really
`std::vector<T, std::allocator<T>>`, and `std::map<K, V>` has a default comparator `std::less<K>`.
(Since C++17 you can sometimes drop the `<>` and let CTAD fill in the arguments, but CTAD deduces from
the initializers *before* it falls back to the defaults: `Counter clicks{"clicks"};` gives
`Label = const char*`, not `std::string`. Writing `<>` says exactly what you mean.)

## Template aliases

A `using` alias gives a long type a short name. With `template`, the alias itself can have parameters:

```cpp run
#include <iostream>
#include <map>
#include <string>
#include <vector>

using Names = std::vector<std::string>;          // plain alias (no template)

template <typename T>
using Grid = std::vector<std::vector<T>>;        // alias template

template <typename V>
using StringMap = std::map<std::string, V>;      // fix one parameter, keep the other

int main() {
    Names names{"Ada", "Linus"};
    Grid<int> g(2, std::vector<int>(3, 7));      // 2 rows, 3 columns of 7
    StringMap<double> prices{{"apple", 0.5}};

    std::cout << names[1] << ' ' << g.size() << 'x' << g[0].size() << ' '
              << prices["apple"] << '\n';
}
```

```output
Linus 2x3 0.5
```

An alias template is not a new type: `Grid<int>` *is* `std::vector<std::vector<int>>`. The older
`typedef` keyword can make plain aliases but **cannot** make alias templates, which is one reason
`using` is preferred in modern code.

## Static members and friends (briefly)

Every instantiation gets its own copy of a `static` data member: `Box<int>::count` and
`Box<double>::count` are separate variables. Use `inline static` (C++17) to define it inside the class.
And when a class template needs an `operator<<`, the simplest approach is to define a `friend` right
inside the class:

```cpp run
#include <iostream>

template <typename T>
class Point {
public:
    Point(T x, T y) : x_(x), y_(y) { ++created; }

    friend std::ostream& operator<<(std::ostream& out, const Point& p) {
        return out << '(' << p.x_ << ", " << p.y_ << ')';
    }

    inline static int created = 0;

private:
    T x_, y_;
};

int main() {
    Point a(1, 2);
    Point b(3, 4);
    Point c(0.5, 1.5);
    std::cout << a << ' ' << c << '\n';
    std::cout << Point<int>::created << ' ' << Point<double>::created << '\n';
}
```

```output
(1, 2) (0.5, 1.5)
2 1
```

:::quiz
Which line correctly defines `size()` outside of `template <typename T> class Bag`?

- [ ] `std::size_t Bag::size() const { ... }`
- [ ] `template <typename T> std::size_t Bag::size() const { ... }`
- [x] `template <typename T> std::size_t Bag<T>::size() const { ... }`
- [ ] `std::size_t Bag<T>::size() const { ... }`

You need both the template header (`template <typename T>`) and the full class name `Bag<T>`.
:::

:::quiz
With CTAD, what type is `x` in `std::pair x(3, "hi");`?

- [ ] `std::pair<int, std::string>`
- [x] `std::pair<int, const char*>`
- [ ] It doesn't compile
- [ ] `std::pair<int, char>`

A string literal is an array of `const char`, which decays to `const char*`. CTAD deduces exactly that,
not `std::string`.
:::

:::exercise Stack of anything {easy}
Write a class template `Stack<T>` with `push`, `pop`, `top`, `empty` and `size`, storing its elements in
a `std::vector<T>`. Use one `Stack<int>` and one `Stack<std::string>`.

**Input:** `n` followed by `n` integers, then `m` followed by `m` words.
**Output:** two lines. The first contains the integers popped off the stack (so in reverse order),
separated by single spaces. The second contains the words, popped the same way. If a stack had no
elements, print `empty` on its line instead.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

class IntStack {
public:
    void push(int v) { items_.push_back(v); }
    void pop() { items_.pop_back(); }
    int top() const { return items_.back(); }
    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }
private:
    std::vector<int> items_;
};

int main() {
    int n;
    std::cin >> n;
    IntStack s;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        s.push(x);
    }
    // turn IntStack into Stack<T>, then print both stacks as described
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& v) { items_.push_back(v); }
    void pop() { items_.pop_back(); }
    const T& top() const { return items_.back(); }
    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }
private:
    std::vector<T> items_;
};

template <typename T>
void drain(Stack<T>& s) {
    if (s.empty()) {
        std::cout << "empty\n";
        return;
    }
    bool first = true;
    while (!s.empty()) {
        if (!first) std::cout << ' ';
        std::cout << s.top();
        s.pop();
        first = false;
    }
    std::cout << '\n';
}

int main() {
    int n;
    std::cin >> n;
    Stack<int> nums;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        nums.push(x);
    }
    int m;
    std::cin >> m;
    Stack<std::string> words;
    for (int i = 0; i < m; ++i) {
        std::string w;
        std::cin >> w;
        words.push(w);
    }
    drain(nums);
    drain(words);
}
```

```hint
Start with `template <typename T> class Stack { ... };` and replace `int` with `T` where it means
"element type". `size()` keeps returning `std::size_t`.
```

```hint
A small helper `template <typename T> void drain(Stack<T>& s)` can print and empty either stack.
```

```stdin
4 1 2 3 4
3 alpha beta gamma
```

```expected
4 3 2 1
gamma beta alpha
```

```stdin
0
1 solo
```

```expected hidden
empty
solo
```

```stdin
1 -9
0
```

```expected hidden
-9
empty
```

```checks
must template\s*<\s*(typename|class)\s+\w+\s*>\s*(class|struct)\s+Stack :: Define Stack as a class template.
must Stack\s*<\s*int\s*> :: Use a Stack<int>.
must Stack\s*<\s*std::string\s*> :: Use a Stack<std::string>.
```
:::

:::exercise Grid with an alias template {easy}
Define an alias template `Grid<T>` for `std::vector<std::vector<T>>` and use it to store a grid of
integers. Then print the sum of each row.

**Input:** `rows` and `cols`, followed by `rows * cols` integers in row order.
**Output:** one line per row containing that row's sum. If `rows` is 0, print `no rows`.

```cpp starter
#include <iostream>
#include <vector>

// define the alias template Grid here

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    // create a Grid<int>, read it, print each row's sum
}
```

```cpp solution
#include <iostream>
#include <vector>

template <typename T>
using Grid = std::vector<std::vector<T>>;

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    Grid<int> g(rows, std::vector<int>(cols));
    for (auto& row : g)
        for (int& x : row) std::cin >> x;

    if (g.empty()) {
        std::cout << "no rows\n";
        return 0;
    }
    for (const auto& row : g) {
        long long sum = 0;
        for (int x : row) sum += x;
        std::cout << sum << '\n';
    }
}
```

```hint
`template <typename T> using Grid = std::vector<std::vector<T>>;`
```

```hint
`Grid<int> g(rows, std::vector<int>(cols));` creates `rows` rows, each with `cols` zeros.
```

```stdin
2 3
1 2 3
4 5 6
```

```expected
6
15
```

```stdin
3 1
-5
0
5
```

```expected hidden
-5
0
5
```

```stdin
0 4
```

```expected hidden
no rows
```

```stdin
1 0
```

```expected hidden
0
```

```checks
must template\s*<[^>]*>\s*using\s+Grid\s*= :: Define Grid as an alias template.
must Grid\s*<\s*int\s*> :: Use Grid<int>.
```
:::

:::exercise Min-max tracker {medium}
Write a class template `MinMax<T>` that remembers the smallest and largest value it has been given.
Declare the member functions inside the class but **define them outside** it:

- `void add(const T& value)`
- `const T& min() const` and `const T& max() const`
- `bool empty() const`

**Input:** `n` and `n` integers, then `m` and `m` words.
**Output:** `ints: MIN MAX` and `words: MIN MAX` on two lines (words compare alphabetically). If a
tracker received no values, print `ints: none` / `words: none` instead.

```cpp starter
#include <iostream>
#include <string>

template <typename T>
class MinMax {
public:
    void add(const T& value);
    const T& min() const;
    const T& max() const;
    bool empty() const;

private:
    T lo_{}, hi_{};
    bool has_ = false;
};

// define the four member functions here, outside the class

int main() {
    // read the input, fill a MinMax<int> and a MinMax<std::string>, print the results
}
```

```cpp solution
#include <iostream>
#include <string>

template <typename T>
class MinMax {
public:
    void add(const T& value);
    const T& min() const;
    const T& max() const;
    bool empty() const;

private:
    T lo_{}, hi_{};
    bool has_ = false;
};

template <typename T>
void MinMax<T>::add(const T& value) {
    if (!has_) {
        lo_ = hi_ = value;
        has_ = true;
        return;
    }
    if (value < lo_) lo_ = value;
    if (hi_ < value) hi_ = value;
}

template <typename T>
const T& MinMax<T>::min() const { return lo_; }

template <typename T>
const T& MinMax<T>::max() const { return hi_; }

template <typename T>
bool MinMax<T>::empty() const { return !has_; }

template <typename T>
void report(const std::string& label, const MinMax<T>& mm) {
    std::cout << label << ": ";
    if (mm.empty()) std::cout << "none\n";
    else std::cout << mm.min() << ' ' << mm.max() << '\n';
}

int main() {
    int n;
    std::cin >> n;
    MinMax<int> ints;
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        ints.add(x);
    }
    int m;
    std::cin >> m;
    MinMax<std::string> words;
    for (int i = 0; i < m; ++i) {
        std::string w;
        std::cin >> w;
        words.add(w);
    }
    report("ints", ints);
    report("words", words);
}
```

```hint
Each definition looks like `template <typename T> void MinMax<T>::add(const T& value) { ... }`.
```

```hint
The first value added is both the minimum and the maximum. That's what the `has_` flag is for.
```

```stdin
5 4 -2 9 0 9
3 kiwi apple mango
```

```expected
ints: -2 9
words: apple mango
```

```stdin
1 -5
0
```

```expected hidden
ints: -5 -5
words: none
```

```stdin
3 5 7 6
2 m z
```

```expected hidden
ints: 5 7
words: m z
```

```stdin
3 -1 -1 -1
2 b B
```

```expected hidden
ints: -1 -1
words: B b
```

```checks
must MinMax\s*<\s*T\s*>\s*::\s*add :: Define add outside the class as MinMax<T>::add.
must MinMax\s*<\s*T\s*>\s*::\s*(min|max) :: Define min and max outside the class too.
```
:::

:::exercise Min stack {hard}
A classic interview question: build a stack that can also report its **smallest** element, where
`push`, `pop`, `top` and `min` all run in **O(1)**. (Scanning the whole stack for `min` is O(n) and
doesn't count.)

Write a class template `MinStack<T>` with `push(const T&)`, `pop()`, `top()`, `min()`, `empty()` and
`size()`. Then drive one `MinStack<int>` and one `MinStack<std::string>` with commands.

**Input:** one command per line until the input ends. Each line starts with `i` (the int stack) or
`s` (the string stack), followed by one of:

- `push X`: push `X` (an integer for `i`, a word for `s`); prints nothing,
- `pop`: remove the top; prints nothing,
- `top`: print the top element,
- `min`: print the smallest element (words compare alphabetically with `<`).

`pop`, `top` and `min` on an empty stack print `error: empty` instead.

**Output:** the printed lines, then a final line `sizes: I S` with the sizes of the int and string
stacks.

Example: `i push 5`, `i push 3`, `i min`, `i pop`, `i min` prints `3` and then `5`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
        // handle the command for the int stack (i) or the string stack (s)
    }
    std::cout << "sizes: 0 0\n";
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

template <typename T>
class MinStack {
public:
    void push(const T& value) {
        items_.push_back(value);
        // mins_.back() is always the minimum of everything currently on the stack
        if (mins_.empty() || value < mins_.back()) mins_.push_back(value);
        else mins_.push_back(mins_.back());
    }
    void pop() {
        items_.pop_back();
        mins_.pop_back();
    }
    const T& top() const { return items_.back(); }
    const T& min() const { return mins_.back(); }
    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }

private:
    std::vector<T> items_;
    std::vector<T> mins_;   // mins_[k] = minimum of items_[0..k]
};

template <typename T>
void handle(MinStack<T>& s, const std::string& cmd) {
    if (cmd == "push") {
        T value;
        std::cin >> value;
        s.push(value);
        return;
    }
    if (s.empty()) {
        std::cout << "error: empty\n";
        return;
    }
    if (cmd == "pop") s.pop();
    else if (cmd == "top") std::cout << s.top() << '\n';
    else if (cmd == "min") std::cout << s.min() << '\n';
}

int main() {
    MinStack<int> ints;
    MinStack<std::string> words;
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
        if (which == 'i') handle(ints, cmd);
        else handle(words, cmd);
    }
    std::cout << "sizes: " << ints.size() << ' ' << words.size() << '\n';
}
```

```hint
Keep a second vector next to the elements: entry `k` stores the minimum of the first `k + 1`
elements. Pushing appends `min(value, previous minimum)`; popping pops both vectors.
```

```hint
A common bug is to store a new minimum only when `value < currentMin`. Then pushing the same minimum
twice and popping once loses it. The "parallel minimums" approach above has no such corner case.
```

```hint
A function template `template <typename T> void handle(MinStack<T>& s, const std::string& cmd)` can
process a command for either stack; for `push`, read a `T` from `std::cin`.
```

```stdin
i push 5
i push 3
i min
i pop
i min
i top
s push pear
s push apple
s min
s top
```

```expected
3
5
5
apple
apple
sizes: 1 2
```

```stdin
i pop
s min
i push 7
i top
```

```expected
error: empty
error: empty
7
sizes: 1 0
```

```stdin
i push 2
i push 2
i push 4
i pop
i pop
i min
i push 1
i min
i pop
i min
i pop
i min
```

```expected hidden
2
1
2
error: empty
sizes: 0 0
```

```stdin
s push kiwi
s push Zebra
s push apple
s min
s pop
s min
s pop
s pop
s top
i push -3
i push -10
i push 0
i min
i top
```

```expected hidden
Zebra
Zebra
error: empty
-10
0
sizes: 3 0
```

```checks
must template\s*<\s*(typename|class)\s+\w+\s*>\s*(class|struct)\s+MinStack :: Write MinStack as a class template.
must MinStack\s*<\s*int\s*> :: Use a MinStack<int>.
must MinStack\s*<\s*std::string\s*> :: Use a MinStack<std::string>.
```
:::
