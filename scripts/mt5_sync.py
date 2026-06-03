import argparse
import json
import sys
import os
import subprocess
import time
from datetime import datetime, timedelta

# ── ensure MetaTrader5 is importable ─────────────────────────────────────────
try:
    import MetaTrader5 as mt5
except ImportError:
    try:
        subprocess.check_call(["uv", "pip", "install", "--system", "MetaTrader5"], stderr=subprocess.DEVNULL)
        import MetaTrader5 as mt5
    except Exception:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "MetaTrader5"], stderr=subprocess.DEVNULL)
            import MetaTrader5 as mt5
        except Exception as e:
            print(json.dumps({"error": f"Could not install MetaTrader5 library: {e}"}))
            sys.exit(1)

# ── known terminal paths (ordered – most commonly used first) ─────────────────
KNOWN_TERMINAL_PATHS = [
    r"C:\Program Files\MetaTrader 5 - Copy (3)\terminal64.exe",   # Exness (detected)
    r"C:\Program Files\MetaTrader 5 - Copy (2)\terminal64.exe",
    r"C:\Program Files\MetaTrader 5 - Copy (4)\terminal64.exe",
    r"C:\Program Files\MetaTrader 5 - Copy\terminal64.exe",
    r"C:\Program Files\MetaTrader 5\terminal64.exe",
    r"C:\Program Files\MetaTrader 5 - Copy (5)\terminal64.exe",
    r"C:\Program Files (x86)\MetaTrader 5\terminal64.exe",
]

LAUNCH_WAIT_SECONDS = 10   # how long to wait after auto-launching a terminal


def try_initialize(path=None):
    """Try mt5.initialize() with optional path. Returns True on success."""
    kwargs = {}
    if path and os.path.isfile(path):
        kwargs["path"] = path
    try:
        return mt5.initialize(**kwargs)
    except Exception:
        return False


def launch_and_wait(exe_path):
    """Launch a terminal executable and wait for IPC to become ready."""
    try:
        subprocess.Popen([exe_path])
        for _ in range(LAUNCH_WAIT_SECONDS * 2):   # poll every 0.5 s
            time.sleep(0.5)
            if try_initialize(exe_path):
                return True
        return False
    except Exception:
        return False


def find_or_launch_terminal(target_server: str, target_login: int):
    """
    Strategy:
    1. Try each known path without launching anything.
       - If the terminal is already running AND has the right account → use it directly.
       - If it's running but wrong account, keep as fallback.
    2. If no direct match, try to launch each terminal whose path exists and
       see if after startup it shows the target account.
    Returns (path, needs_login) or (None, False) if all fail.
    """
    running_fallback = None    # any running terminal (wrong account)
    candidate_paths = [p for p in KNOWN_TERMINAL_PATHS if os.path.isfile(p)]

    # --- pass 1: check what's already running --------------------------------
    for path in candidate_paths:
        if try_initialize(path):
            info = mt5.account_info()
            mt5.shutdown()
            if info is None:
                running_fallback = running_fallback or (path, True)
                continue
            # Exact match
            if info.login == target_login:
                return path, False          # already logged in correctly
            # Same broker (server name overlap)
            tgt = target_server.lower()
            srv = info.server.lower()
            if tgt in srv or srv in tgt:
                return path, True           # same broker, needs login()
            # Any running terminal
            if running_fallback is None:
                running_fallback = (path, True)

    # --- pass 2: try launching not-yet-running terminals ---------------------
    for path in candidate_paths:
        # If it responded in pass 1 it's already running – skip relaunch
        if try_initialize(path):
            mt5.shutdown()
            continue
        # Terminal exists but isn't responding → try launching it
        if launch_and_wait(path):
            info = mt5.account_info()
            mt5.shutdown()
            if info and info.login == target_login:
                return path, False          # perfect match after launch
            if info is None and running_fallback is None:
                running_fallback = (path, True)

    return running_fallback or (candidate_paths[0] if candidate_paths else None, True)


def initialize_mt5(path, login, password, server):
    """
    Initialize MT5 and ensure we are on the right account.
    Returns (success: bool, error_msg: str | None)
    """
    if not try_initialize(path):
        # One more attempt: auto-launch
        if path and os.path.isfile(path):
            launched = launch_and_wait(path)
            if not launched:
                return False, (
                    "Could not initialize MetaTrader 5. "
                    "Please open your Exness MT5 terminal manually and ensure it is logged in, then try again."
                )
        else:
            return False, (
                "No MetaTrader 5 terminal found on this PC. "
                "Please install and open MetaTrader 5 for Exness, then try again."
            )

    info = mt5.account_info()

    # Already on the right account
    if info and info.login == login:
        return True, None

    # Try explicit login (works on same-broker terminals)
    authorized = mt5.login(login=login, password=password, server=server)
    if not authorized:
        err = mt5.last_error()
        current = f"login {info.login} on {info.server}" if info else "unknown"
        # Error -10006 = Unsupported means different broker → surface actionable message
        return False, (
            f"Could not switch to Exness account {login} on '{server}'. "
            f"The active terminal is running {current}. "
            f"Please open the MetaTrader 5 terminal for Exness (not Deriv or Darwinex), "
            f"log in to account {login}, and then click Sync again. MT5 Error: {err}"
        )

    return True, None


def main():
    parser = argparse.ArgumentParser(description="Sync closed trade history from MetaTrader 5.")
    parser.add_argument("--login",    type=int,  required=True)
    parser.add_argument("--password", type=str,  required=True)
    parser.add_argument("--server",   type=str,  required=True)
    parser.add_argument("--path",     type=str,  default=None,
                        help="Optional explicit path to terminal64.exe")
    parser.add_argument("--days",     type=int,  default=365,
                        help="Days of history to fetch (default 365)")
    args = parser.parse_args()

    # ── terminal discovery ─────────────────────────────────────────────────────
    if args.path and os.path.isfile(args.path):
        terminal_path = args.path
    else:
        terminal_path, _ = find_or_launch_terminal(args.server, args.login)

    # ── connect ───────────────────────────────────────────────────────────────
    ok, err_msg = initialize_mt5(terminal_path, args.login, args.password, args.server)
    if not ok:
        print(json.dumps({"error": err_msg}))
        sys.exit(1)

    # ── fetch deal history ────────────────────────────────────────────────────
    from_date = datetime.now() - timedelta(days=args.days)
    to_date   = datetime.now() + timedelta(days=1)

    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        err = mt5.last_error()
        mt5.shutdown()
        print(json.dumps({"error": f"Failed to retrieve deal history. Error: {err}"}))
        sys.exit(1)

    # ── group deals → closed trades ───────────────────────────────────────────
    positions = {}
    for deal in deals:
        pid = deal.position_id
        if pid == 0:
            continue  # deposits / withdrawals
        positions.setdefault(pid, []).append(deal)

    trades = []
    for pid, deal_list in positions.items():
        deal_list.sort(key=lambda x: x.time_msc)

        entry_deal = None
        exit_deal  = None
        for deal in deal_list:
            if deal.entry == 0 and entry_deal is None:   # IN
                entry_deal = deal
            elif deal.entry in (1, 2):                    # OUT / IN+OUT
                exit_deal = deal

        if entry_deal is None or exit_deal is None:
            continue   # still-open position

        lot        = entry_deal.volume
        profit     = sum(d.profit     for d in deal_list)
        commission = sum(d.commission for d in deal_list)
        swap       = sum(d.swap       for d in deal_list)
        net_pnl    = profit + commission + swap

        dt       = datetime.fromtimestamp(entry_deal.time)
        date_str = dt.strftime("%Y-%m-%d %H:%M")
        dir_str  = "Buy" if entry_deal.type == 0 else "Sell"

        exit_dt      = datetime.fromtimestamp(exit_deal.time)
        hold_minutes = max(0, int((exit_dt - dt).total_seconds() / 60))

        trades.append({
            "symbol":        entry_deal.symbol,
            "dir":           dir_str,
            "lot":           lot,
            "entry":         entry_deal.price,
            "exit":          exit_deal.price,
            "pnl":           round(net_pnl, 2),
            "dateTime":      date_str,
            "executionTime": dt.strftime("%H:%M"),
            "holdMinutes":   hold_minutes,
            "comment":       entry_deal.comment or "",
            "positionId":    str(pid),
        })

    account = mt5.account_info()
    mt5.shutdown()

    print(json.dumps({
        "success":  True,
        "account":  args.login,
        "broker":   args.server,
        "balance":  account.balance if account else 0,
        "currency": account.currency if account else "USD",
        "trades":   trades,
    }))


if __name__ == "__main__":
    main()
