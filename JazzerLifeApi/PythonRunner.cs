using System;
using System.Diagnostics;
using System.IO;

namespace JazzerLifeApi
{
	public class PythonRunner
	{
		// 正式機與測試機的 scripts 資料夾都是「<各自的路徑前綴>\JazzerLifes\scripts\」同樣的相對結構，
		// 只有前綴不同，因此路徑不寫死在程式碼裡，改由 appsettings.json 的 "ScriptsRoot" 設定（各機器自行維護，不進版控）。
		// 若忘記設定，退回舊有的正式機路徑，維持向下相容、不會直接壞掉。
		private const string DefaultScriptsRoot = @"C:\Users\ServerDeployArea\JazzerLife\scripts\";
		private static string _scriptsRoot = DefaultScriptsRoot;

		// Python 直譯器路徑：預設沿用「ScriptsRoot\venv\Scripts\python.exe」（正式機原有的 venv 結構，向下相容）。
		// 若某台機器沒有/不需要 venv（例如目前腳本都只用標準函式庫），可在 appsettings.json 設定 "PythonExePath"
		// 直接覆寫成該機器實際的 python.exe 路徑，兩者互相獨立、互不影響。
		private static string? _pythonExePathOverride = null;
		private const int TimeoutMs = 30000;

		/// <summary>應用程式啟動時呼叫一次，從 appsettings.json 帶入本機實際路徑設定。</summary>
		public static void Configure(string? scriptsRoot, string? pythonExePathOverride = null)
		{
			if (!string.IsNullOrWhiteSpace(scriptsRoot))
				_scriptsRoot = scriptsRoot.EndsWith('\\') ? scriptsRoot : scriptsRoot + '\\';

			if (!string.IsNullOrWhiteSpace(pythonExePathOverride))
				_pythonExePathOverride = pythonExePathOverride;
		}

		public static string PythonExePath => _pythonExePathOverride ?? Path.Combine(_scriptsRoot, "venv", "Scripts", "python.exe");

		public static string RunTestTask(string jobId)
		{
			return RunScript("test_task.py", new[] { jobId }, TimeoutMs);
		}

		/// <summary>
		/// 安全執行 scripts 目錄下的 Python 腳本：檔名限定於固定資料夾內、參數以陣列傳遞（不經 shell 拼接），
		/// 並設定逾時強制終止，避免程序卡死或指令注入。
		/// </summary>
		/// <param name="scriptFileName">腳本檔名（僅檔名，不可含路徑，固定從 ScriptsRoot 取用）</param>
		/// <param name="args">傳給腳本的參數陣列</param>
		/// <param name="timeoutMs">執行逾時（毫秒）</param>
		public static string RunScript(string scriptFileName, string[] args, int timeoutMs = 60000)
		{
			if (string.IsNullOrWhiteSpace(scriptFileName) || scriptFileName.Contains("..") || scriptFileName.Contains('/') || scriptFileName.Contains('\\'))
				throw new ArgumentException("非法的腳本檔名", nameof(scriptFileName));

			var scriptPath = Path.Combine(_scriptsRoot, scriptFileName);

			var psi = new ProcessStartInfo
			{
				FileName = PythonExePath,
				UseShellExecute = false,
				RedirectStandardOutput = true,
				RedirectStandardError = true,
				CreateNoWindow = true
			};
			psi.ArgumentList.Add(scriptPath);
			foreach (var arg in args)
				psi.ArgumentList.Add(arg);

			using var process = Process.Start(psi);
			if (process == null)
				throw new InvalidOperationException($"無法啟動 Python 程序（腳本：{scriptFileName}）");

			string output = process.StandardOutput.ReadToEnd();
			string error = process.StandardError.ReadToEnd();

			bool finished = process.WaitForExit(timeoutMs);
			if (!finished)
			{
				try { process.Kill(entireProcessTree: true); } catch { /* 程序可能已自行結束，忽略 */ }
				throw new TimeoutException($"Python 腳本執行逾時（腳本：{scriptFileName}）");
			}

			if (process.ExitCode != 0)
				throw new Exception($"Python 腳本執行失敗（腳本：{scriptFileName}，結束碼：{process.ExitCode}）：{error}");

			return output;
		}
	}
}