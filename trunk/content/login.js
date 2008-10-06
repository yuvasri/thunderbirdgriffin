var GriffinLogin = {
    login: function(){
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        window.top.connection.login(username, password);
    }
};