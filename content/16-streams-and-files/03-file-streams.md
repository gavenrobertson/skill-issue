---
title: Reading & Writing Files
summary: std::ofstream and std::ifstream, checking that a file opened, reading by line, word, and character, open modes like append and binary, and why files close themselves.
---

## Files are just streams

Everything a program keeps in variables vanishes when it exits. To keep data around (settings, save
games, logs, reports) you write it to a **file**. In C++, files are streams from `<fstream>`:

| Class | Direction | Default open mode |
| --- | --- | --- |
| `std::ofstream` | write | `std::ios::out \| std::ios::trunc` (create or **empty** the file) |
| `std::ifstream` | read | `std::ios::in` (file must exist) |
| `std::fstream` | read and write | `std::ios::in \| std::ios::out` (file must exist) |

Since they derive from `std::ostream` / `std::istream`, you already know how to use them: `<<`, `>>`,
`std::getline`, `get`, and every manipulator work exactly as with `std::cout` and `std::cin`.

> **Note:** File I/O works in this site's sandbox, so the examples and exercises really create files.
> They're created in the program's current working directory, and the examples delete them at the end
> with `std::filesystem::remove` so they don't leave clutter. On your own machine, a relative name like
> `"notes.txt"` means "in the directory the program was started from".

## Writing a file: `std::ofstream`

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>

int main() {
    {
        std::ofstream out("fs_write_demo.txt");     // open (create or truncate) for writing
        if (!out) {                                 // always check it opened
            std::cout << "could not open file\n";
            return 1;
        }
        out << "line one\n";
        out << "the answer is " << 42 << '\n';
    }   // <- out is destroyed here: the buffer is flushed and the file is closed

    std::cout << "wrote " << std::filesystem::file_size("fs_write_demo.txt") << " bytes\n";
    std::filesystem::remove("fs_write_demo.txt");   // tidy up
}
```

```output
wrote 26 bytes
```

Three things to notice:

1. **Opening** happens in the constructor. You can also construct an empty stream and call `.open(name)` later.
2. **Checking**: opening can fail (no permission, the folder doesn't exist, the disk is full...). A
   stream that failed to open converts to `false`, so `if (!out)` catches it. `out.is_open()` asks the
   same question more explicitly.
3. **Closing** happens automatically in the destructor. That's **RAII** (from the classes module): the
   stream object owns the file and releases it when it goes out of scope, even if an exception is thrown.
   You *can* call `out.close()` yourself, which is useful when you want to reopen or read the file
   before the scope ends.

```cpp
std::ofstream log;              // not connected to any file yet
log.open("log.txt");            // open later
if (!log.is_open()) { /* ... */ }
log << "started\n";
log.close();                    // explicit close: flushes and releases the file
log.open("other.txt");          // the same object can open another file
```

## Reading a file: `std::ifstream`

There are three common reading styles, the same as for `std::cin`.

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

int main() {
    const std::string name = "fs_read_demo.txt";
    {
        std::ofstream out(name);
        out << "Roses are red\nViolets are blue\n";
    }

    // 1. Line by line with std::getline
    std::ifstream in(name);
    if (!in) {
        std::cout << "cannot open " << name << '\n';
        return 1;
    }
    std::string line;
    int n = 0;
    while (std::getline(in, line)) {
        std::cout << ++n << ": " << line << '\n';
    }

    // 2. Word by word with >> (a fresh stream starts at the beginning again)
    std::ifstream words(name);
    std::string w;
    int count = 0;
    while (words >> w) ++count;
    std::cout << "words: " << count << '\n';

    // 3. Character by character with get
    std::ifstream chars(name);
    char c;
    int vowels = 0;
    while (chars.get(c)) {
        if (std::string("aeiouAEIOU").find(c) != std::string::npos) ++vowels;
    }
    std::cout << "vowels: " << vowels << '\n';

    std::filesystem::remove(name);
}
```

```output
1: Roses are red
2: Violets are blue
words: 6
vowels: 12
```

To slurp a **whole file** into one string, copy the file's buffer into a string stream:

```cpp
std::ifstream in("data.txt");
std::ostringstream contents;
contents << in.rdbuf();             // copy every byte
std::string all = contents.str();
```

### Reading a file that doesn't exist

An `std::ifstream` for a missing file simply fails to open. Nothing crashes, but every read fails, so
always check:

```cpp run
#include <fstream>
#include <iostream>

int main() {
    std::ifstream in("this_file_does_not_exist.txt");
    if (!in) {
        std::cout << "open failed, as expected\n";
    }
    std::cout << std::boolalpha << "is_open: " << in.is_open() << '\n';
}
```

```output
open failed, as expected
is_open: false
```

## Write, then read back

A program often writes a file and later reads it. The writer must be **flushed** (usually by closing
it) before the reader looks, or the data may still be sitting in the writer's buffer. Put the writer
in its own scope, or call `.close()`:

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

int main() {
    const std::string name = "fs_scores.txt";

    std::ofstream out(name);
    out << "alice 90\nbob 72\ncarol 85\n";
    out.close();                         // flush and close BEFORE reading

    std::ifstream in(name);
    std::string who;
    int score;
    int total = 0;
    int count = 0;
    while (in >> who >> score) {         // read pairs until the end
        total += score;
        ++count;
    }
    std::cout << count << " scores, average " << total / count << '\n';

    std::filesystem::remove(name);
}
```

```output
3 scores, average 82
```

## Open modes

The second constructor argument (or `.open` argument) is a set of **mode flags** from `std::ios`,
combined with `|`:

| Flag | Meaning |
| --- | --- |
| `std::ios::in` | open for reading |
| `std::ios::out` | open for writing |
| `std::ios::trunc` | erase the existing contents when opening |
| `std::ios::app` | **append**: every write goes to the end of the file |
| `std::ios::ate` | start positioned **at the end** (but you may move elsewhere) |
| `std::ios::binary` | no newline translation (matters on Windows); use for non-text data |

### Appending

`std::ofstream` normally **truncates** (empties) the file when it opens it. To add to the end
instead, use `std::ios::app`. Logs are the classic example:

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

void logLine(const std::string& file, const std::string& msg) {
    std::ofstream log(file, std::ios::app);    // open for appending
    log << msg << '\n';
}                                              // closed here

int main() {
    const std::string name = "fs_app.log";
    std::ofstream(name, std::ios::trunc);      // create or empty the file (temporary closes at once)

    logLine(name, "boot");
    logLine(name, "load config");
    logLine(name, "ready");

    std::ifstream in(name);
    std::string line;
    while (std::getline(in, line)) std::cout << "> " << line << '\n';

    std::filesystem::remove(name);
}
```

```output
> boot
> load config
> ready
```

Without `std::ios::app`, each call to `logLine` would wipe the file, and only `ready` would remain.

### Reading and writing the same file: `std::fstream`

`std::fstream` with `std::ios::in | std::ios::out` opens an **existing** file for both. Each stream
has a position for reading (`seekg`/`tellg`, "get") and writing (`seekp`/`tellp`, "put"):

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

int main() {
    const std::string name = "fs_both.txt";
    std::ofstream(name) << "hello world\n";     // create it (temporary stream)

    std::fstream file(name, std::ios::in | std::ios::out);
    file.seekp(0);                  // move the write position to the start
    file << "HELLO";                // overwrite the first 5 characters
    file.seekg(0);                  // move the read position to the start
    std::string line;
    std::getline(file, line);
    std::cout << line << '\n';

    file.seekg(0, std::ios::end);   // jump to the end...
    std::cout << "size: " << file.tellg() << '\n';   // ...and ask where we are

    file.close();
    std::filesystem::remove(name);
}
```

```output
HELLO world
size: 12
```

> **Pitfall:** `std::fstream file("new.txt");` does **not** create a missing file, because the default
> mode includes `std::ios::in`, which requires the file to exist. Add `std::ios::trunc` (or
> `std::ios::app`) to create it: `std::fstream f(name, std::ios::in | std::ios::out | std::ios::trunc);`

## Binary files

Text files store numbers as digits: `1000000` takes 7 bytes plus a separator. **Binary** files store a
value's raw bytes: an `int` always takes `sizeof(int)` bytes, and no parsing is needed. Use
`std::ios::binary` and the unformatted functions `write` and `read`, which work on raw bytes
(`char` buffers):

```cpp run
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>

int main() {
    const char* name = "fs_numbers.bin";
    std::vector<int> data{10, -20, 300000, 4};

    {
        std::ofstream out(name, std::ios::binary);
        int count = static_cast<int>(data.size());
        out.write(reinterpret_cast<const char*>(&count), sizeof count);            // one int
        out.write(reinterpret_cast<const char*>(data.data()), data.size() * sizeof(int));  // the array
    }

    std::cout << "file size: " << std::filesystem::file_size(name) << " bytes\n";

    std::ifstream in(name, std::ios::binary);
    int count = 0;
    in.read(reinterpret_cast<char*>(&count), sizeof count);
    std::vector<int> back(count);
    in.read(reinterpret_cast<char*>(back.data()), count * sizeof(int));

    for (int x : back) std::cout << x << ' ';
    std::cout << '\n';
    std::filesystem::remove(name);
}
```

```output
file size: 20 bytes
10 -20 300000 4
```

(`sizeof(int)` is 4 on every mainstream platform, hence 5 × 4 = 20 bytes.)

The `reinterpret_cast<const char*>(&x)` says "treat the bytes of `x` as a character array". Rules for
binary I/O:

- Only do this for **trivially copyable** types: integers, floating point, and plain structs of them.
  **Never** `write` a `std::string`, `std::vector`, or anything with pointers: you'd save the pointer
  value, not the data it points to.
- Binary files are **not portable**: different machines may disagree on `sizeof(int)`, byte order
  (endianness), and struct padding. For data that leaves your machine, use text (or a real
  serialization format like JSON or Protocol Buffers).
- `in.gcount()` tells you how many bytes the last `read` actually got.

## Common mistakes

- **Forgetting to check that the file opened.** Reads from a failed stream silently do nothing, so the
  program appears to work but processes zero records.
- **Reading before the writer is closed.** Close (or scope) the `std::ofstream` first.
- **Overwriting a file you meant to extend.** `std::ofstream` truncates by default; use `std::ios::app`.
- **Expecting `std::fstream` to create a file.** It won't without `trunc` or `app`.
- **Writing `std::endl` after every line of a big file.** Each one forces a slow flush. Use `'\n'`.

```cpp compile-error
#include <fstream>

int main() {
    std::ifstream in("data.txt");
    in << "hello";       // error: no match for 'operator<<': an ifstream is input-only
}
```

:::quiz
What happens to the existing contents of `log.txt` here?

```cpp
std::ofstream out("log.txt");
out << "new entry\n";
```

- [x] They are erased; the file now contains only `new entry`
- [ ] `new entry` is added at the end
- [ ] It fails to open because the file exists
- [ ] It's a compile error without an open mode

`std::ofstream`'s default mode is `out | trunc`, which empties the file. Use `std::ios::app` to append.
:::

:::quiz
When is a file opened by `std::ofstream out("a.txt");` inside a function closed if you never call `close()`?

- [ ] Never: it leaks until the program ends
- [x] When `out` goes out of scope (its destructor runs)
- [ ] Immediately after each `<<`
- [ ] When `main` returns, no earlier

File streams follow RAII: the destructor flushes and closes the file at the end of the object's scope.
:::

:::exercise Numbered copy
Read every line of standard input and write it to a file named `ex_numbered.txt`, prefixing each line
with its line number, a colon, and a space (`1: first line`). Close the file, then open it again
with `std::ifstream`, print its contents line by line, and finally print `lines: <n>`.
Delete the file at the end with `std::filesystem::remove`.

For an empty input, print only `lines: 0`.

```cpp starter
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

int main() {
    const std::string name = "ex_numbered.txt";
    // 1. write numbered lines with std::ofstream
    // 2. read the file back with std::ifstream and print it
    // 3. remove the file
}
```

```cpp solution
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

int main() {
    const std::string name = "ex_numbered.txt";
    {
        std::ofstream out(name);
        std::string line;
        int n = 0;
        while (std::getline(std::cin, line)) {
            out << ++n << ": " << line << '\n';
        }
    }

    std::ifstream in(name);
    std::string line;
    int lines = 0;
    while (std::getline(in, line)) {
        std::cout << line << '\n';
        ++lines;
    }
    in.close();
    std::cout << "lines: " << lines << '\n';
    std::filesystem::remove(name);
}
```

```hint
Put the `std::ofstream` in its own `{ ... }` block (or call `.close()`), so the file is complete before
you open it for reading.
```

```stdin
first line
second line
```

```expected
1: first line
2: second line
lines: 2
```

```stdin
only

after a blank
```

```expected hidden
1: only
2:
3: after a blank
lines: 3
```

```expected
lines: 0
```

```checks
must ofstream :: Write the file with std::ofstream.
must ifstream :: Read it back with std::ifstream.
```
:::

:::exercise Append-only log
Each input line is a command:

- `log <message>`: append `<message>` as a new line to the file `ex_events.log` (open it with `std::ios::app` **each time**),
- `show`: print every line currently in the file, each prefixed with `- `, then `(<n> entries)`.

Before processing commands, create the file empty (open it once with `std::ios::trunc`). Delete it
when you're done.

```cpp starter
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

const std::string kLog = "ex_events.log";

void append(const std::string& message) {
    // open kLog in append mode and write message
}

void show() {
    // print the file's lines
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.rfind("log ", 0) == 0) {
            append(line.substr(4));
        } else if (line == "show") {
            show();
        }
    }
}
```

```cpp solution
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

const std::string kLog = "ex_events.log";

void append(const std::string& message) {
    std::ofstream out(kLog, std::ios::app);
    out << message << '\n';
}

void show() {
    std::ifstream in(kLog);
    std::string line;
    int n = 0;
    while (std::getline(in, line)) {
        std::cout << "- " << line << '\n';
        ++n;
    }
    std::cout << "(" << n << " entries)\n";
}

int main() {
    {
        std::ofstream reset(kLog, std::ios::trunc);
    }
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.rfind("log ", 0) == 0) {
            append(line.substr(4));
        } else if (line == "show") {
            show();
        }
    }
    std::filesystem::remove(kLog);
}
```

```hint
`std::ofstream out(kLog, std::ios::app);` opens for appending. Because `out` is a local variable, the
file is closed when `append` returns, so `show` sees everything written so far.
```

```stdin
log started
log user alice logged in
show
log user alice logged out
show
```

```expected
- started
- user alice logged in
(2 entries)
- started
- user alice logged in
- user alice logged out
(3 entries)
```

```stdin
show
log x
show
```

```expected hidden
(0 entries)
- x
(1 entries)
```

```checks
must ios::app :: Open the log with std::ios::app.
must ios::trunc :: Create the empty log with std::ios::trunc.
```
:::

:::exercise Word frequency from a file
Copy all of standard input into a file `ex_words.txt`. Then read the file back **word by word** (with
`>>`), counting how often each word occurs, and print each distinct word with its count, in
alphabetical order, as `<word> <count>`. Finish with `distinct: <n>`. Delete the file at the end.

Words are separated by whitespace and compared exactly (case-sensitive).

```cpp starter
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <string>

int main() {
    const std::string name = "ex_words.txt";
    // copy stdin to the file, then read it back word by word
}
```

```cpp solution
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <string>

int main() {
    const std::string name = "ex_words.txt";
    {
        std::ofstream out(name);
        std::string line;
        while (std::getline(std::cin, line)) {
            out << line << '\n';
        }
    }

    std::map<std::string, int> counts;
    {
        std::ifstream in(name);
        std::string word;
        while (in >> word) {
            ++counts[word];
        }
    }

    for (const auto& [word, count] : counts) {
        std::cout << word << ' ' << count << '\n';
    }
    std::cout << "distinct: " << counts.size() << '\n';
    std::filesystem::remove(name);
}
```

```hint
A `std::map<std::string, int>` keeps keys sorted, and `++counts[word]` creates missing entries at 0.
```

```stdin
the cat and the hat
and the bat
```

```expected
and 2
bat 1
cat 1
hat 1
the 3
distinct: 5
```

```stdin
  Go go   GO
```

```expected hidden
GO 1
Go 1
go 1
distinct: 3
```

```expected
distinct: 0
```

```checks
must ofstream :: Write the input to the file with std::ofstream.
must ifstream :: Read the words back with std::ifstream.
```
:::

:::exercise Binary round trip
Read `n` and then `n` integers. Write them to the binary file `ex_ints.bin` using `std::ios::binary`
and `.write` (first the count as an `int`, then the values). Close it, then read the file back with
`.read` into a new `std::vector<int>`.

Print `bytes: <file size>` (use `std::filesystem::file_size`), then the values you **read back** in
reverse order separated by single spaces on one line, then `sum: <sum>`. Delete the file at the end.

For `n = 0`, the second line is empty and the sum is `0`. Assume `sizeof(int)` is 4.

```cpp starter
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>

int main() {
    const char* name = "ex_ints.bin";
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) std::cin >> v;
    // write, read back, print
}
```

```cpp solution
#include <filesystem>
#include <fstream>
#include <iostream>
#include <vector>

int main() {
    const char* name = "ex_ints.bin";
    int n;
    std::cin >> n;
    std::vector<int> values(n);
    for (int& v : values) std::cin >> v;

    {
        std::ofstream out(name, std::ios::binary);
        out.write(reinterpret_cast<const char*>(&n), sizeof n);
        out.write(reinterpret_cast<const char*>(values.data()), n * sizeof(int));
    }

    std::cout << "bytes: " << std::filesystem::file_size(name) << '\n';

    std::ifstream in(name, std::ios::binary);
    int count = 0;
    in.read(reinterpret_cast<char*>(&count), sizeof count);
    std::vector<int> back(count);
    in.read(reinterpret_cast<char*>(back.data()), count * sizeof(int));
    in.close();

    long long sum = 0;
    for (int i = count - 1; i >= 0; --i) {
        std::cout << back[i] << (i > 0 ? " " : "");
        sum += back[i];
    }
    std::cout << '\n' << "sum: " << sum << '\n';
    std::filesystem::remove(name);
}
```

```hint
`out.write(reinterpret_cast<const char*>(values.data()), n * sizeof(int));` writes the whole array at
once. Reading is the mirror image with `reinterpret_cast<char*>`.
```

```hint
The file holds one count plus `n` values: `(n + 1) * 4` bytes.
```

```stdin
3
7 -2 100000
```

```expected
bytes: 16
100000 -2 7
sum: 100005
```

```stdin
0
```

```expected hidden
bytes: 4

sum: 0
```

```stdin
5
2147483647 2147483647 1 1 -5
```

```expected
bytes: 24
-5 1 1 2147483647 2147483647
sum: 4294967291
```

```checks
must ios::binary :: Open the file with std::ios::binary.
must \.write\s*\( :: Write the values with .write().
must \.read\s*\( :: Read them back with .read().
```
:::
