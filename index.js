var Pool = require('./generic-pool'),
	Redis = require("redis"),
	path = require("path"),
	os = require("os");

var poolIndex = 0;

var redisSockExists = null;

var RedisPool = function( config ){
	
	config.host = config.host || "127.0.0.1";
	config.maxConnections = config.maxConnections || 100;
	config.removeConnectionAfter = config.removeConnectionAfter || 30000;
	
	poolIndex++;
	var lastConnectionId = 0;
	
	var that = this;
		
	this.config = config;
	this._pool = Pool.Pool({
		name: "redis_" + poolIndex,
		create: function( callback ) {
			
			//console.log("Redis Pool: ", "Create connection");
			
			var _connection = that._createConnection();
			lastConnectionId++;
			_connection.__id = "rcon-" + lastConnectionId;
			
			callback( _connection );
			
		},		
		destroy: function( connection ){
			//console.log("Redis Pool: ", "Сlose connection");		
			
			//console.log("---DESTROY", connection.__id);
				
			connection.quit();
		},
		validate: function( connection ){
			return connection.connected;
		},
		
		max: config.maxConnections,
		idleTimeoutMillis: config.removeConnectionAfter,
		log: false
	});		
	
};

RedisPool.prototype.getConnection = function( callback ){
	this._pool.acquire( callback );
};

RedisPool.prototype.end = function(cb) {
  this._pool.destroyAllNow();
  cb();
};

RedisPool.prototype.getConnectionDirect = function( callback ){
	
	var rawConnection = this._createConnectionRaw();
	rawConnection.end = function(){
		rawConnection.quit();
	};
	
	console.log("Get direct redis connection");
	
	callback( null, rawConnection );
};

RedisPool.prototype._createConnectionRaw = function(){
	
	var that = this;
		
	var config = this.config;
		
	var connection = null;	
		
	if( config.sock && this.redisSockExists === null ){
		this.redisSockExists = path.existsSync( config.sock );			
	}
	
	if( config.sock && this.redisSockExists ){
		connection = Redis.createClient( config.redis.sock );
	}
	else{
		connection = Redis.createClient( null, config.host );
	}
		
	return connection;
	
};

RedisPool.prototype._createConnection = function(){
	
	var that = this;	
	var connection = this._createConnectionRaw();
	
	// add extra functionality
	connection.end = function(){
		that._pool.release( connection );
	}
	
	return connection;
	
};

exports.createPool = function( config ){
	return new RedisPool( config );
};
