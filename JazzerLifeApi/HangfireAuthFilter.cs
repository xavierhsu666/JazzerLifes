using System.Net;
using Hangfire.Dashboard;

namespace JazzerLifeApi
{
	public class HangfireAuthFilter : IDashboardAuthorizationFilter
	{
		public bool Authorize(DashboardContext context)
		{
			var httpContext = context.GetHttpContext();
			var remoteIp = httpContext.Connection.RemoteIpAddress;

			if (remoteIp == null)
				return false;

			// 允許本機 loopback
			if (IPAddress.IsLoopback(remoteIp))
				return true;

			// 允許整個 192.168.x.x 區網網段
			var bytes = remoteIp.GetAddressBytes();
			if (remoteIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
				&& bytes[0] == 192 && bytes[1] == 168)
			{
				return true;
			}

			return false;
		}
	}
}