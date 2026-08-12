// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

contract AdversarialToken {
    enum Mode {
        STANDARD,
        FALSE_RETURN,
        REVERT_CALL,
        SHORT_TRANSFER,
        BONUS_TRANSFER
    }

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    Mode public transferMode;
    Mode public transferFromMode;

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function setTransferMode(Mode mode) external {
        transferMode = mode;
    }

    function setTransferFromMode(Mode mode) external {
        transferFromMode = mode;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount, transferMode);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        Mode mode = transferFromMode;
        if (mode == Mode.FALSE_RETURN) return false;
        if (mode == Mode.REVERT_CALL) revert("adversarial transferFrom");

        uint256 approved = allowance[from][msg.sender];
        if (approved != type(uint256).max) allowance[from][msg.sender] = approved - amount;
        return _move(from, to, amount, mode);
    }

    function _transfer(address from, address to, uint256 amount, Mode mode) private returns (bool) {
        if (mode == Mode.FALSE_RETURN) return false;
        if (mode == Mode.REVERT_CALL) revert("adversarial transfer");
        return _move(from, to, amount, mode);
    }

    function _move(address from, address to, uint256 amount, Mode mode) private returns (bool) {
        balanceOf[from] -= amount;
        uint256 received = amount;
        if (mode == Mode.SHORT_TRANSFER && amount != 0) received = amount - 1;
        if (mode == Mode.BONUS_TRANSFER) received = amount + 1;
        balanceOf[to] += received;
        return true;
    }
}
