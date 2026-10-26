package com.mdl.tclremote

import com.mdl.tclremote.ui.AppIcons
import org.junit.Assert.assertEquals
import org.junit.Test

class AppIconsTest {
    @Test
    fun prefersIconImageAndRequestsSquareSize() {
        val html = """
            <meta property="og:image" content="https://play-lh.googleusercontent.com/banner=w526-h296">
            <img src="https://play-lh.googleusercontent.com/shot=w526-h296" alt="Screenshot image">
            <img src="https://play-lh.googleusercontent.com/icon123=w240-h480-rw" class="T75of" alt="Icon image" itemprop="image">
        """
        assertEquals("https://play-lh.googleusercontent.com/icon123=s192", AppIcons.iconUrl(html))
    }

    @Test
    fun fallsBackToOgImage() {
        val html = """<meta property="og:image" content="https://play-lh.googleusercontent.com/og=w526">"""
        assertEquals("https://play-lh.googleusercontent.com/og=s192", AppIcons.iconUrl(html))
    }
}

class UpdatesTest {
    @Test
    fun parsesBuildNumberAndApkUrl() {
        val json = org.json.JSONObject(
            """{"name":"Mi TCL (build 21)","assets":[{"name":"MiTCL.apk","browser_download_url":"https://x/MiTCL.apk"}]}""",
        )
        val info = com.mdl.tclremote.system.Updates.parse(json)
        assertEquals(21, info?.build)
        assertEquals("https://x/MiTCL.apk", info?.url)
    }
}

class HomeArrivalTest {
    private val arrival = com.mdl.tclremote.system.HomeArrival

    @Test
    fun matchesTvSubnet() {
        val phone = arrival.parseIpv4("192.168.0.37")!!
        val tv = arrival.parseIpv4("192.168.0.14")!!
        org.junit.Assert.assertTrue(arrival.sameSubnet(phone, tv, 24))
        org.junit.Assert.assertFalse(arrival.sameSubnet(arrival.parseIpv4("192.168.1.37")!!, tv, 24))
        org.junit.Assert.assertNull(arrival.parseIpv4("tv.local"))
    }

    @Test
    fun hourWindowWrapsMidnight() {
        org.junit.Assert.assertTrue(arrival.inWindow(3, 0, 0))
        org.junit.Assert.assertTrue(arrival.inWindow(18, 17, 23))
        org.junit.Assert.assertFalse(arrival.inWindow(23, 17, 23))
        org.junit.Assert.assertTrue(arrival.inWindow(1, 20, 2))
        org.junit.Assert.assertFalse(arrival.inWindow(12, 20, 2))
    }
}
