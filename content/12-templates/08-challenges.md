---
title: "Templates & Generic Programming: Challenges"
summary: Hard, interview-style problems that combine class and function templates, non-type parameters, variadic templates, if constexpr and concepts with the earlier modules.
---

These problems are meant to be **hard**. Each one is a small, complete program: you get a precise
specification, an example and a bare skeleton, and you design the rest yourself. Hidden tests check the
edge cases (empty input, full containers, mismatched sizes, ties), so read the spec carefully and think
about what could go wrong before you submit.

Try each problem on your own before opening the hints. If you get stuck, reread the lesson the problem
leans on: class templates and non-type parameters for the containers, variadic templates and folds for
the table printer, `if constexpr`, traits and concepts for the statistics.

## Warm-up: predict the output

:::quiz
What does this program print?

```cpp
#include <iostream>

template <typename T> void f(T)    { std::cout << 'A'; }
template <typename T> void f(T*)   { std::cout << 'B'; }
template <>           void f(int*) { std::cout << 'C'; }

int main() {
    int x = 0;
    double d = 0;
    f(&x);
    f(x);
    f(&d);
}
```

- [ ] `AAA`
- [ ] `BAB`
- [x] `CAB`
- [ ] `CAC`

The specialization `template <> void f(int*)` could belong to `f(T)` (with `T = int*`) or to `f(T*)`
(with `T = int`). The compiler picks the **more specialized** primary, `f(T*)`. So for `f(&x)`, overload
resolution chooses `f(T*)` and then finds its `int*` specialization: `C`. `f(x)` can only use `f(T)`:
`A`. `f(&d)` uses `f(T*)` with `T = double`, which has no specialization: `B`. Move the specialization
**above** `f(T*)` and it would specialize `f(T)` instead, and `f(&x)` would print `B`.
:::

:::quiz
What does `std::cout << g(1, 2, 3) << ' ' << h(1, 2, 3);` print?

```cpp
template <typename... Ts> auto g(Ts... xs) { return (xs - ... - 100); }
template <typename... Ts> auto h(Ts... xs) { return (100 - ... - xs); }
```

- [ ] `94 94`
- [x] `-98 94`
- [ ] `-106 -106`
- [ ] `-98 -98`

`g` is a binary **right** fold: `1 - (2 - (3 - 100))` = `1 - (2 - (-97))` = `1 - 99` = `-98`. `h` is a
binary **left** fold: `((100 - 1) - 2) - 3` = `94`. With a non-associative operator like `-`, which
side the `...` is on changes the answer.
:::

## Problems

:::exercise Bounded queue {hard}
Embedded systems and real-time code avoid heap allocation, so they use fixed-capacity containers whose
size is a compile-time constant. Write a class template

```cpp
template <typename T, std::size_t N>
class BoundedQueue;
```

a first-in-first-out queue that holds at most `N` elements in a `std::array<T, N>` used as a **ring
buffer**: keep the index of the front element and the count, and wrap indices around with `% N`. (No
`std::vector`, `std::deque`, `std::queue` or `std::list`.) It needs `bool push(const T&)` (false if
full), `bool pop()` (false if empty), `const T& front() const`, `size()`, `empty()`, `full()`, a
`static constexpr std::size_t capacity()` returning `N`, and a way to visit the elements from front to
back without removing them.

Drive a `BoundedQueue<int, 3>` and a `BoundedQueue<std::string, 2>` with commands.

**Input:** one command per line until the input ends, each starting with `i` (the int queue) or `s`
(the string queue):

| Command | Output |
| --- | --- |
| `push X` | nothing, or `full` if the queue is full (then `X` is dropped) |
| `pop` | the removed front element, or `empty` |
| `front` | the front element, or `empty` |
| `size` | `S/N`, e.g. `2/3` |

After the last command, print `i:` and `s:` lines listing each queue's contents from front to back,
every element preceded by a space.

Example: `i push 1`, `i push 2`, `i pop`, `i size` prints `1` and `1/3`, then `i: 2` and `s:`.

```cpp starter
#include <array>
#include <cstddef>
#include <iostream>
#include <string>

int main() {
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
    }
    std::cout << "i:\ns:\n";
}
```

```cpp solution
#include <array>
#include <cstddef>
#include <iostream>
#include <string>

template <typename T, std::size_t N>
class BoundedQueue {
    static_assert(N > 0, "capacity must be positive");

public:
    bool push(const T& value) {
        if (full()) return false;
        data_[(head_ + count_) % N] = value;
        ++count_;
        return true;
    }
    bool pop() {
        if (empty()) return false;
        head_ = (head_ + 1) % N;
        --count_;
        return true;
    }
    const T& front() const { return data_[head_]; }
    std::size_t size() const { return count_; }
    bool empty() const { return count_ == 0; }
    bool full() const { return count_ == N; }
    static constexpr std::size_t capacity() { return N; }

    template <typename F>
    void forEach(F f) const {
        for (std::size_t k = 0; k < count_; ++k) f(data_[(head_ + k) % N]);
    }

private:
    std::array<T, N> data_{};
    std::size_t head_ = 0;    // index of the front element
    std::size_t count_ = 0;   // number of stored elements
};

template <typename T, std::size_t N>
void handle(BoundedQueue<T, N>& q, const std::string& cmd) {
    if (cmd == "push") {
        T value;
        std::cin >> value;
        if (!q.push(value)) std::cout << "full\n";
    } else if (cmd == "pop") {
        if (q.empty()) {
            std::cout << "empty\n";
        } else {
            std::cout << q.front() << '\n';
            q.pop();
        }
    } else if (cmd == "front") {
        if (q.empty()) std::cout << "empty\n";
        else std::cout << q.front() << '\n';
    } else if (cmd == "size") {
        std::cout << q.size() << '/' << q.capacity() << '\n';
    }
}

template <typename T, std::size_t N>
void dump(const char* label, const BoundedQueue<T, N>& q) {
    std::cout << label << ':';
    q.forEach([](const T& value) { std::cout << ' ' << value; });
    std::cout << '\n';
}

int main() {
    BoundedQueue<int, 3> ints;
    BoundedQueue<std::string, 2> words;
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
        if (which == 'i') handle(ints, cmd);
        else handle(words, cmd);
    }
    dump("i", ints);
    dump("s", words);
}
```

```hint
With `head_` (index of the front) and `count_`, the next free slot is `(head_ + count_) % N`, and
popping just advances `head_ = (head_ + 1) % N`. The `k`-th element from the front is at
`(head_ + k) % N`.
```

```hint
Write the command handling once, as a template over both parameters:
`template <typename T, std::size_t N> void handle(BoundedQueue<T, N>& q, const std::string& cmd)`.
For `push`, read a `T` from `std::cin`; the push must still consume the value when the queue is full.
```

```hint
To visit the elements, a member template `template <typename F> void forEach(F f) const` that calls
`f` on each element in order is simple and works with a lambda.
```

```stdin
i push 1
i push 2
i pop
i size
```

```expected
1
1/3
i: 2
s:
```

```stdin
s push a
s push b
s push c
s size
s pop
s push d
s front
i pop
i front
```

```expected
full
2/2
a
b
empty
empty
i:
s: b d
```

```stdin
i push 1
i push 2
i push 3
i push 4
i pop
i push 5
i pop
i push 6
i pop
i push 7
i size
i front
```

```expected hidden
full
1
2
3
3/3
5
i: 5 6 7
s:
```

```stdin
s push x
s pop
s pop
s push y
s push z
s pop
s push w
s pop
s pop
s pop
s size
i push -1
i push 0
```

```expected hidden
x
empty
y
z
w
empty
0/2
i: -1 0
s:
```

```checks
must template\s*<\s*typename\s+\w+\s*,\s*std::size_t\s+\w+\s*> :: Declare template <typename T, std::size_t N>.
must std::array\s*<\s*T\s*,\s*N\s*> :: Store the elements in a std::array<T, N>.
mustnot std::(vector|deque|queue|list) :: Build the ring buffer yourself on top of std::array.
must %\s*N :: Wrap the indices around with % N.
```
:::

:::exercise Generic matrix {hard}
Write a class template `Matrix<T>` (sizes known only at run time) with:

- a constructor `Matrix(std::size_t rows, std::size_t cols)` filled with `T{}`, storing the elements
  in one `std::vector<T>` in row order,
- `rows()`, `cols()`, and element access `T& operator()(std::size_t r, std::size_t c)` (plus a `const`
  version),
- `operator+` (same shape), `operator*` (matrix product: `a.cols() == b.rows()`), and `transpose()`.

Write the operations once and use them for two element types: the program first reads `int` or
`real` and then works with `Matrix<long long>` or `Matrix<double>`. A function template
`template <typename T> void run()` that does all the work, called with the right `T`, keeps `main` tiny.

**Input:** the type (`int` or `real`); then `m` and `m` matrices, each as `r c` followed by `r * c`
values in row order; then operations until the input ends, using 0-based matrix numbers:

| Operation | Result |
| --- | --- |
| `add A B` | `A + B`, or `error: shape mismatch` if the shapes differ |
| `mul A B` | `A * B`, or `error: shape mismatch` if `A.cols() != B.rows()` |
| `transpose A` | the transpose of `A` |

**Output:** for each operation, either the error line, or a line `R x C` followed by the `R` rows of the
result, values separated by single spaces (printed with `<<`).

```cpp starter
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::string type;
    std::cin >> type;
}
```

```cpp solution
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

template <typename T>
class Matrix {
public:
    Matrix(std::size_t rows, std::size_t cols) : rows_(rows), cols_(cols), data_(rows * cols, T{}) {}

    std::size_t rows() const { return rows_; }
    std::size_t cols() const { return cols_; }
    T& operator()(std::size_t r, std::size_t c) { return data_[r * cols_ + c]; }
    const T& operator()(std::size_t r, std::size_t c) const { return data_[r * cols_ + c]; }

    Matrix transpose() const {
        Matrix t(cols_, rows_);
        for (std::size_t r = 0; r < rows_; ++r)
            for (std::size_t c = 0; c < cols_; ++c) t(c, r) = (*this)(r, c);
        return t;
    }

    friend Matrix operator+(const Matrix& a, const Matrix& b) {
        Matrix sum(a.rows_, a.cols_);
        for (std::size_t i = 0; i < a.data_.size(); ++i) sum.data_[i] = a.data_[i] + b.data_[i];
        return sum;
    }

    friend Matrix operator*(const Matrix& a, const Matrix& b) {
        Matrix p(a.rows_, b.cols_);
        for (std::size_t r = 0; r < a.rows_; ++r)
            for (std::size_t c = 0; c < b.cols_; ++c) {
                T total{};
                for (std::size_t k = 0; k < a.cols_; ++k) total += a(r, k) * b(k, c);
                p(r, c) = total;
            }
        return p;
    }

private:
    std::size_t rows_, cols_;
    std::vector<T> data_;
};

template <typename T>
void print(const Matrix<T>& m) {
    std::cout << m.rows() << " x " << m.cols() << '\n';
    for (std::size_t r = 0; r < m.rows(); ++r) {
        for (std::size_t c = 0; c < m.cols(); ++c) {
            if (c > 0) std::cout << ' ';
            std::cout << m(r, c);
        }
        std::cout << '\n';
    }
}

template <typename T>
void run() {
    std::size_t count;
    std::cin >> count;
    std::vector<Matrix<T>> ms;
    for (std::size_t i = 0; i < count; ++i) {
        std::size_t r, c;
        std::cin >> r >> c;
        Matrix<T> m(r, c);
        for (std::size_t y = 0; y < r; ++y)
            for (std::size_t x = 0; x < c; ++x) std::cin >> m(y, x);
        ms.push_back(m);
    }
    std::string op;
    while (std::cin >> op) {
        std::size_t a, b = 0;
        std::cin >> a;
        if (op != "transpose") std::cin >> b;
        const Matrix<T>& A = ms[a];
        const Matrix<T>& B = ms[b];
        if (op == "transpose") {
            print(A.transpose());
        } else if (op == "add") {
            if (A.rows() != B.rows() || A.cols() != B.cols()) std::cout << "error: shape mismatch\n";
            else print(A + B);
        } else if (op == "mul") {
            if (A.cols() != B.rows()) std::cout << "error: shape mismatch\n";
            else print(A * B);
        }
    }
}

int main() {
    std::string type;
    std::cin >> type;
    if (type == "int") run<long long>();
    else run<double>();
}
```

```hint
Store element `(r, c)` at index `r * cols + c` of the vector. Inside the class, the injected name
`Matrix` means `Matrix<T>`, so `Matrix transpose() const` is enough.
```

```hint
Define the operators as **friends inside the class** (`friend Matrix operator+(const Matrix& a, const
Matrix& b)`): that's the simplest way for a class template. Start each product sum at `T{}`.
```

```hint
Check the shapes in `run` before calling the operator, so the operators themselves can assume valid
input. A product of an `r x k` and a `k x c` matrix is `r x c`; a `1 x 3` times a `3 x 1` is `1 x 1`.
```

```stdin
int
2
2 2
1 2
3 4
2 2
5 6
7 8
add 0 1
mul 0 1
transpose 0
```

```expected
2 x 2
6 8
10 12
2 x 2
19 22
43 50
2 x 2
1 3
2 4
```

```stdin
real
2
1 3
0.5 1 1.5
2 2
1 0
0 1
add 0 1
mul 0 1
mul 1 1
transpose 0
```

```expected
error: shape mismatch
error: shape mismatch
2 x 2
1 0
0 1
3 x 1
0.5
1
1.5
```

```stdin
int
3
1 3
1 2 3
3 1
4 5 6
2 3
-1 0 1
2 2 2
mul 0 1
mul 1 0
mul 2 1
mul 1 2
add 0 2
transpose 1
```

```expected hidden
1 x 1
32
3 x 3
4 8 12
5 10 15
6 12 18
2 x 1
2
30
error: shape mismatch
error: shape mismatch
1 x 3
4 5 6
```

```stdin
int
1
2 2
100000 100000
100000 100000
mul 0 0
add 0 0
```

```expected hidden
2 x 2
20000000000 20000000000
20000000000 20000000000
2 x 2
200000 200000
200000 200000
```

```checks
must template\s*<\s*(typename|class)\s+\w+\s*>\s*(class|struct)\s+Matrix :: Write Matrix as a class template.
must operator\s*\+ :: Overload operator+.
must operator\s*\* :: Overload operator*.
must Matrix\s*<\s*long\s+long\s*>|run\s*<\s*long\s+long\s*>|<\s*long\s+long\s*> :: Use the same template with long long ...
must <\s*double\s*> :: ... and with double.
```
:::

:::exercise Statistics for any element type {hard}
Write a reusable `summary(const std::vector<T>& v)` that adapts to its element type:

- For **numbers** (define a concept `Number`: integral or floating point, but **not** `bool`), print
  `count=N sum=S min=A max=B mean=M median=D`.
  - The sum is accumulated in `long long` for integral `T` and in `double` for floating-point `T`
    (pick the type with `std::conditional_t`). Integral sums are printed as integers, floating-point
    sums with 2 decimals.
  - `min` and `max` are printed as values of `T` (2 decimals for floating point).
  - `mean` and `median` are always printed with 2 decimals; for an even count the median is the
    average of the two middle values.
- For any other **ordered** type (`std::totally_ordered`, such as `std::string`) that isn't a
  `Number`, print only `count=N min=A max=B`.
- An empty vector prints just `count=0`, whatever the type.

Use two constrained overloads (or one template with `if constexpr`) so that, for example, a
`std::vector<std::string>` never even tries to compute a mean.

**Input:** lines `TYPE n` followed by `n` values, where `TYPE` is `int` (read as `int`), `real`
(`double`) or `word` (`std::string`).
**Output:** one summary line per input line.

Example: `int 4 3 1 4 1` prints `count=4 sum=9 min=1 max=4 mean=2.25 median=2.00`.

```cpp starter
#include <concepts>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::string type;
    int n;
    while (std::cin >> type >> n) {
        std::string skip;
        for (int i = 0; i < n; ++i) std::cin >> skip;
        std::cout << "count=" << n << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <concepts>
#include <iomanip>
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
concept Number = (std::integral<T> || std::floating_point<T>) && !std::same_as<T, bool>;

template <typename T>
void printValue(const T& x) {
    if constexpr (std::floating_point<T>) std::cout << std::fixed << std::setprecision(2) << x;
    else std::cout << x;
}

template <Number T>
void summary(std::vector<T> v) {
    std::cout << "count=" << v.size();
    if (v.empty()) {
        std::cout << '\n';
        return;
    }
    using Sum = std::conditional_t<std::integral<T>, long long, double>;
    Sum sum{};
    for (const T& x : v) sum += x;
    std::sort(v.begin(), v.end());
    std::size_t n = v.size();
    double median = n % 2 == 1 ? static_cast<double>(v[n / 2])
                               : (static_cast<double>(v[n / 2 - 1]) + static_cast<double>(v[n / 2])) / 2;
    double mean = static_cast<double>(sum) / static_cast<double>(n);

    std::cout << " sum=";
    printValue(sum);
    std::cout << " min=";
    printValue(v.front());
    std::cout << " max=";
    printValue(v.back());
    std::cout << std::fixed << std::setprecision(2) << " mean=" << mean << " median=" << median << '\n';
}

template <std::totally_ordered T>
    requires(!Number<T>)
void summary(const std::vector<T>& v) {
    std::cout << "count=" << v.size();
    if (!v.empty()) {
        auto [lo, hi] = std::minmax_element(v.begin(), v.end());
        std::cout << " min=" << *lo << " max=" << *hi;
    }
    std::cout << '\n';
}

template <typename T>
void readAndSummarize(int n) {
    std::vector<T> v(n);
    for (T& x : v) std::cin >> x;
    summary(v);
}

int main() {
    std::string type;
    int n;
    while (std::cin >> type >> n) {
        if (type == "int") readAndSummarize<int>(n);
        else if (type == "real") readAndSummarize<double>(n);
        else readAndSummarize<std::string>(n);
    }
}
```

```hint
`template <typename T> concept Number = (std::integral<T> || std::floating_point<T>) && !std::same_as<T, bool>;`
Then `template <Number T> void summary(...)` and
`template <std::totally_ordered T> requires (!Number<T>) void summary(...)` never overlap.
```

```hint
`using Sum = std::conditional_t<std::integral<T>, long long, double>;` picks the accumulator type. Sum
`int`s into a `long long`: a few large values overflow an `int`.
```

```hint
The median needs sorted values: take the vector **by value** (a copy you may sort) or copy it first.
Convert to `double` before adding the two middle values: two big `int`s can overflow, and integer
division would truncate.
```

```stdin
int 4 3 1 4 1
real 3 2.5 -1 0.25
word 3 pear apple fig
```

```expected
count=4 sum=9 min=1 max=4 mean=2.25 median=2.00
count=3 sum=1.75 min=-1.00 max=2.50 mean=0.58 median=0.25
count=3 min=apple max=pear
```

```stdin
int 0
word 0
real 1 7
```

```expected
count=0
count=0
count=1 sum=7.00 min=7.00 max=7.00 mean=7.00 median=7.00
```

```stdin
int 3 2000000000 2000000000 2000000000
int 2 -3 -4
int 5 5 5 5 5 5
word 4 b B a A
real 4 0.1 0.2 0.3 0.4
```

```expected hidden
count=3 sum=6000000000 min=2000000000 max=2000000000 mean=2000000000.00 median=2000000000.00
count=2 sum=-7 min=-4 max=-3 mean=-3.50 median=-3.50
count=5 sum=25 min=5 max=5 mean=5.00 median=5.00
count=4 min=A max=b
count=4 sum=1.00 min=0.10 max=0.40 mean=0.25 median=0.25
```

```checks
must concept\s+\w+\s*= :: Define a concept for numbers.
must conditional_t :: Choose the accumulator type with std::conditional_t.
must template\s*<\s*Number\s+\w+\s*>|requires\s+Number|Number\s+auto :: Constrain the numeric summary with your concept.
```
:::

:::exercise Aligned table {hard}
Print an inventory as an aligned text table. The heart of it is one **variadic** function that formats
a row of cells of any types:

```cpp
template <typename... Ts>
std::string row(const std::array<std::size_t, sizeof...(Ts)>& widths, const Ts&... cells);
```

Each cell is turned into text with a `cellText` function template that uses `if constexpr`:
floating-point values get exactly 2 decimals, other arithmetic values print normally, strings as they
are. Text cells (strings) are **left-aligned** and padded with spaces to the column width; numeric cells
are **right-aligned**. A row looks like `| cell | cell | cell |`: one space of padding inside each `|`.

**Input:** `n`, then `n` lines `name qty price` (a word, an integer, a decimal).
**Output:** the table:

1. a header row with the texts `item`, `qty`, `price` (the header cells are text, so left-aligned),
2. a separator: `|` then, for each column, `width + 2` dashes followed by `|`,
3. one row per item,
4. the separator again,
5. a total row: `TOTAL`, the sum of the quantities, and the sum of `qty * price`.

Each column is as wide as its widest cell, **including** the header and the total row.

Example for `apple 3 0.5` and `watermelon 1 3.25`:

```
| item       | qty | price |
|------------|-----|-------|
| apple      |   3 |  0.50 |
| watermelon |   1 |  3.25 |
|------------|-----|-------|
| TOTAL      |   4 |  4.75 |
```

```cpp starter
#include <array>
#include <cstddef>
#include <iostream>
#include <string>

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string name;
        int qty;
        double price;
        std::cin >> name >> qty >> price;
        std::cout << name << ' ' << qty << ' ' << price << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <array>
#include <cstddef>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
std::string cellText(const T& value) {
    std::ostringstream out;
    if constexpr (std::is_floating_point_v<T>) out << std::fixed << std::setprecision(2) << value;
    else out << value;
    return out.str();
}

template <typename... Ts>
std::string row(const std::array<std::size_t, sizeof...(Ts)>& widths, const Ts&... cells) {
    std::string out = "|";
    std::size_t i = 0;
    auto add = [&](const auto& cell) {
        std::string text = cellText(cell);
        std::string pad(widths[i] - text.size(), ' ');
        bool numeric = std::is_arithmetic_v<std::remove_cvref_t<decltype(cell)>>;
        out += ' ' + (numeric ? pad + text : text + pad) + " |";
        ++i;
    };
    (add(cells), ...);   // a comma fold runs left to right
    return out;
}

template <std::size_t N>
std::string separator(const std::array<std::size_t, N>& widths) {
    std::string out = "|";
    for (std::size_t w : widths) out += std::string(w + 2, '-') + "|";
    return out;
}

struct Item {
    std::string name;
    int qty;
    double price;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Item> items(n);
    long long totalQty = 0;
    double totalValue = 0;
    for (auto& it : items) {
        std::cin >> it.name >> it.qty >> it.price;
        totalQty += it.qty;
        totalValue += it.qty * it.price;
    }

    std::array<std::size_t, 3> widths{4, 3, 5};   // "item", "qty", "price"
    auto widen = [&widths](const auto& a, const auto& b, const auto& c) {
        widths[0] = std::max(widths[0], cellText(a).size());
        widths[1] = std::max(widths[1], cellText(b).size());
        widths[2] = std::max(widths[2], cellText(c).size());
    };
    for (const auto& it : items) widen(it.name, it.qty, it.price);
    widen(std::string("TOTAL"), totalQty, totalValue);

    std::cout << row(widths, std::string("item"), std::string("qty"), std::string("price")) << '\n';
    std::cout << separator(widths) << '\n';
    for (const auto& it : items) std::cout << row(widths, it.name, it.qty, it.price) << '\n';
    std::cout << separator(widths) << '\n';
    std::cout << row(widths, std::string("TOTAL"), totalQty, totalValue) << '\n';
}
```

```hint
Two passes: first compute every cell's text length to find the column widths (start them at the
header lengths and include the total row), then print. Reuse `cellText` in both passes so the widths
match what gets printed.
```

```hint
Inside `row`, walk the pack with a comma fold and a running index:
`std::size_t i = 0; (add(cells), ...);` where `add` is a generic lambda that uses `widths[i++]`. Comma
folds are evaluated left to right, so the index matches the column.
```

```hint
`std::is_arithmetic_v<std::remove_cvref_t<decltype(cell)>>` tells a generic lambda whether its argument
is a number (the parameter type is a reference, so strip it first).
```

```stdin
2
apple 3 0.5
watermelon 1 3.25
```

```expected
| item       | qty | price |
|------------|-----|-------|
| apple      |   3 |  0.50 |
| watermelon |   1 |  3.25 |
|------------|-----|-------|
| TOTAL      |   4 |  4.75 |
```

```stdin
0
```

```expected
| item  | qty | price |
|-------|-----|-------|
|-------|-----|-------|
| TOTAL |   0 |  0.00 |
```

```stdin
3
x 1000 0.01
yy 25 12.34
z -2 100
```

```expected hidden
| item  | qty  | price  |
|-------|------|--------|
| x     | 1000 |   0.01 |
| yy    |   25 |  12.34 |
| z     |   -2 | 100.00 |
|-------|------|--------|
| TOTAL | 1023 | 118.50 |
```

```stdin
1
pencil 7 0
```

```expected hidden
| item   | qty | price |
|--------|-----|-------|
| pencil |   7 |  0.00 |
|--------|-----|-------|
| TOTAL  |   7 |  0.00 |
```

```checks
must typename\s*\.\.\. :: Write row as a variadic template.
must sizeof\s*\.\.\. :: Size the widths array with sizeof...(Ts).
must if\s+constexpr :: Format the cells with if constexpr.
```
:::

:::exercise Sorted flat set {hard}
A `std::set` allocates one node per element. For small sets that are searched far more often than
modified, a **flat set**, a sorted `std::vector` searched with binary search, is often faster. Write
one:

```cpp
template <typename T, typename Compare = std::less<T>>
class FlatSet;
```

Like `std::set`, the ordering is a template parameter with a **default**, and two values `a` and `b`
count as equal when neither `comp(a, b)` nor `comp(b, a)` is true. Store a `Compare` object in the class
and use it with `std::lower_bound`. Members:

- `bool insert(const T&)` (false if an equal element exists), `bool erase(const T&)` (false if
  missing), `bool contains(const T&) const`, `size()`,
- `const T* next(const T& x) const`: the first element that does **not** come before `x` in the set's
  order, or `nullptr` if there is none.

Drive a `FlatSet<int>` (ascending) and a `FlatSet<int, std::greater<int>>` (descending): each command
line starts with `a` or `d` to pick the set.

| Command | Output |
| --- | --- |
| `insert X` | `added` or `exists` |
| `erase X` | `removed` or `missing` |
| `has X` | `yes` or `no` |
| `next X` | the element, or `none` (ascending: smallest `>= X`; descending: largest `<= X`) |
| `list` | the elements in the set's order, separated by single spaces, or `(empty)` |

Don't use `std::set` or `std::map`. Each lookup must be O(log n).

```cpp starter
#include <functional>
#include <iostream>
#include <string>
#include <vector>

int main() {
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
    }
}
```

```cpp solution
#include <algorithm>
#include <cstddef>
#include <functional>
#include <iostream>
#include <string>
#include <vector>

template <typename T, typename Compare = std::less<T>>
class FlatSet {
public:
    bool insert(const T& value) {
        auto it = std::lower_bound(items_.begin(), items_.end(), value, comp_);
        if (it != items_.end() && !comp_(value, *it)) return false;   // equal element exists
        items_.insert(it, value);
        return true;
    }
    bool erase(const T& value) {
        auto it = std::lower_bound(items_.begin(), items_.end(), value, comp_);
        if (it == items_.end() || comp_(value, *it)) return false;
        items_.erase(it);
        return true;
    }
    bool contains(const T& value) const {
        auto it = std::lower_bound(items_.begin(), items_.end(), value, comp_);
        return it != items_.end() && !comp_(value, *it);
    }
    const T* next(const T& value) const {
        auto it = std::lower_bound(items_.begin(), items_.end(), value, comp_);
        return it == items_.end() ? nullptr : &*it;
    }
    std::size_t size() const { return items_.size(); }
    const std::vector<T>& items() const { return items_; }

private:
    std::vector<T> items_;   // always sorted by comp_
    Compare comp_{};
};

template <typename T, typename C>
void handle(FlatSet<T, C>& s, const std::string& cmd) {
    if (cmd == "list") {
        if (s.size() == 0) std::cout << "(empty)";
        for (std::size_t i = 0; i < s.items().size(); ++i) std::cout << (i ? " " : "") << s.items()[i];
        std::cout << '\n';
        return;
    }
    T x;
    std::cin >> x;
    if (cmd == "insert") std::cout << (s.insert(x) ? "added" : "exists") << '\n';
    else if (cmd == "erase") std::cout << (s.erase(x) ? "removed" : "missing") << '\n';
    else if (cmd == "has") std::cout << (s.contains(x) ? "yes" : "no") << '\n';
    else if (cmd == "next") {
        const T* p = s.next(x);
        if (p) std::cout << *p << '\n';
        else std::cout << "none\n";
    }
}

int main() {
    FlatSet<int> asc;
    FlatSet<int, std::greater<int>> desc;
    char which;
    std::string cmd;
    while (std::cin >> which >> cmd) {
        if (which == 'a') handle(asc, cmd);
        else handle(desc, cmd);
    }
}
```

```hint
`std::lower_bound(items_.begin(), items_.end(), x, comp_)` returns the first element that does not come
before `x`. The element there is **equal** to `x` exactly when `!comp_(x, *it)` (it's already known
that `!comp_(*it, x)`).
```

```hint
Insert at the position `lower_bound` returned (`items_.insert(it, value)`), and the vector stays
sorted without ever calling `std::sort`.
```

```hint
With `std::greater<int>`, "does not come before `x`" means `<= x`, which is why `next` gives the
largest element `<= x` in the descending set, with no extra code.
```

```stdin
a insert 5
a insert 1
a insert 5
a insert 3
a list
a next 2
a next 6
a has 3
```

```expected
added
added
exists
added
1 3 5
3
none
yes
```

```stdin
d insert 5
d insert 1
d insert 3
d list
d next 4
d next 0
d next 9
d erase 3
d erase 3
d list
```

```expected
added
added
added
5 3 1
3
none
5
removed
missing
5 1
```

```stdin
a list
d list
a next 0
a erase 1
a insert -5
a insert 10
a next -5
a next -4
a next 10
a next 11
d insert -5
d insert 10
d next 10
d next -6
d has -5
a has 7
```

```expected hidden
(empty)
(empty)
none
missing
added
added
-5
10
10
none
added
added
10
none
yes
no
```

```stdin
a insert 2
a insert 2
a erase 2
a erase 2
a has 2
a insert 4
a insert 0
a insert 2
a list
d insert 0
d insert 2
d insert 4
d list
```

```expected hidden
added
exists
removed
missing
no
added
added
added
0 2 4
added
added
added
4 2 0
```

```checks
must template\s*<\s*typename\s+\w+\s*,\s*typename\s+\w+\s*=\s*std::less :: Give the comparator a default: typename Compare = std::less<T>.
must lower_bound :: Search with std::lower_bound.
mustnot std::(set|map|multiset|unordered_set)\b :: Build the set on top of a sorted std::vector.
must FlatSet\s*<\s*int\s*,\s*std::greater :: Use a FlatSet<int, std::greater<int>>.
```
:::
