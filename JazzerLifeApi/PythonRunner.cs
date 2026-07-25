using System;
using System.Diagnostics;

namespace JazzerLifeApi
{
	public class PythonRunner
	{
		private const string PythonExePath = @"C:\Users\ServerDeployArea\JazzerLife\scripts\venv\Scripts\python.exe";
		private const string ScriptPath = @"C:\Users\ServerDeployArea\JazzerLife\scripts\test_task.py";
		private const int TimeoutMs = 30000;

		public static string RunTestTask(string jobId)
		{
			var psi = new ProcessStartInfo
			{
				FileName = PythonExePath,
				ArgumentList = { ScriptPath, jobId },
				UseShellExecute = false,
				RedirectStandardOutput = true,
				RedirectStandardError = true,
				CreateNoWindow = true
			};

			using var process = Process.Start(psi);
			if (process == null)
				throw new InvalidOperationException("無法啟動 Python 程序");

			string output = process.StandardOutput.ReadToEnd();
			string error = process.StandardError.ReadToEnd();

			bool finished = process.WaitForExit(TimeoutMs);
			if (!finished)
			{
				process.Kill();
				throw new TimeoutException($"Python 腳本執行逾時 (job_id={jobId})");
			}

			if (process.ExitCode != 0)
				throw new Exception($"Python 腳本執行失敗: {error}");

			return output;
		}
	}
}