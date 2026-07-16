import subprocess, sys
if __name__ == "__main__":
    r = subprocess.run([sys.executable, "-m", "pytest", "tests/", "-q"], capture_output=True, text=True)
    print(r.stdout)
    if r.returncode == 0:
        print("ALL PASS")
    else:
        print("FAIL")
        sys.exit(1)
